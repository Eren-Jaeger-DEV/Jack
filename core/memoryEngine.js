/**
 * MEMORY ENGINE (v2.0)
 * Additive persistent memory system for Jack.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const UserMemory = require('../bot/database/models/UserMemory');
const embeddingService = require('./embeddingService');
const logger = require('../utils/logger');
require('dotenv').config();

const API_KEYS = (process.env.GOOGLE_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
let currentKeyIndex = 0;

function _getGenAI() {
  const key = API_KEYS[currentKeyIndex] || API_KEYS[0];
  return new GoogleGenerativeAI(key);
}

function _rotateKey() {
  if (API_KEYS.length <= 1) return false;
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  logger.info(`[MEMORY ENGINE] Rotating API Key to index ${currentKeyIndex}`);
  return true;
}

function isLowValueMessage(msg) {
  return (
    msg.length < 10 ||
    /^(hi|ok|yes|no|lol|hello)$/i.test(msg.trim())
  );
}

async function analyzeMessage(message, userId, guildId) {
  if (!message || message.trim().length < 5) return;
  if (isLowValueMessage(message)) return;

  // PROTECTION: Never try to analyze or memorize massive blocks of data (e.g. Base64 strings)
  if (message.length > 2000) {
    logger.info("MEMORY", "Skipping analysis for oversized message.");
    return;
  }

  const prompt = `Classify if this message should be stored as memory.
Return JSON:
{
  "store": true/false,
  "type": "event|behavior|preference",
  "tags": [],
  "importance": 0-1
}

Message: "${message}"

Rules:
- DO NOT store casual chat
- Only store high-value info (preferences, achievements, behaviors, standing)
- If not high-value, store = false
`;

  const executeClassification = async (retryCount = 0) => {
    try {
      const genAI = _getGenAI();
      const model = genAI.getGenerativeModel({
        // Flash model is ideal here: classification is a simple yes/no task,
        // no need for the flagship model — saves quota for real conversations.
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return JSON.parse(text);
    } catch (error) {
      if (error.message.includes("429") && retryCount < API_KEYS.length - 1) {
        _rotateKey();
        return await executeClassification(retryCount + 1);
      }
      throw error;
    }
  };

  try {
    const analysis = await executeClassification();
    
    if (analysis && analysis.store && analysis.importance >= 0.6) {
      await storeMemory({
        userId,
        guildId,
        type: analysis.type || "event",
        content: message,
        tags: analysis.tags || [],
        importance: typeof analysis.importance === 'number' ? analysis.importance : 0.5
      });
    } else {
      logger.info("[MEMORY]", {
        stored: false,
        type: null,
        importance: 0
      });
    }
  } catch (err) {
    logger.error("MEMORY", `Analysis Failed: ${err.message}`);
  }
}

async function storeMemory(memoryObject) {
  try {
    let content = memoryObject.content.trim().substring(0, 300);
    let tags = Array.isArray(memoryObject.tags) ? memoryObject.tags.slice(0, 5) : [];
    let importance = Math.max(0, Math.min(1, memoryObject.importance || 0.5));

    const recentMemories = await UserMemory.find({ userId: memoryObject.userId, guildId: memoryObject.guildId })
      .sort({ createdAt: -1 })
      .limit(10);
      
    function calculateSimilarity(str1, str2) {
      const normalize = s => s.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
      const s1 = normalize(str1);
      const s2 = normalize(str2);
      if (s1 === s2) return 1;
      const words1 = new Set(s1.split(" "));
      const words2 = new Set(s2.split(" "));
      if (words1.size === 0 && words2.size === 0) return 1;
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      return intersection.size / Math.max(words1.size, words2.size);
    }

    const isDuplicate = recentMemories.some(mem => {
      return calculateSimilarity(mem.content, content) > 0.8;
    });

    if (isDuplicate) {
      logger.info("[MEMORY] Duplicate detected, skipping store.");
      return;
    }

    const count = await UserMemory.countDocuments({ userId: memoryObject.userId, guildId: memoryObject.guildId });
    if (count >= 100) {
      // Evict by LOWEST importance, not oldest — preserves high-value ancient memories
      // (e.g. a ban or payment from 3 months ago is more valuable than a low-score recent note)
      const leastImportant = await UserMemory.findOne({ userId: memoryObject.userId, guildId: memoryObject.guildId }).sort({ importance: 1, createdAt: 1 });
      if (leastImportant) await UserMemory.findByIdAndDelete(leastImportant._id);
    }

    let embedding = [];
    if (importance >= 0.6) {
      embedding = await embeddingService.getEmbedding(content);
    }

    const newMemory = new UserMemory({
      userId: memoryObject.userId,
      guildId: memoryObject.guildId,
      type: memoryObject.type,
      content,
      tags,
      importance,
      embedding: embedding.length > 0 ? embedding : undefined
    });

    await newMemory.save();
    logger.info("[MEMORY]", {
      stored: true,
      type: newMemory.type,
      importance: newMemory.importance
    });
  } catch (err) {
    logger.error("MEMORY", `Store Error: ${err.message}`);
  }
}

function extractContextTags(message) {
  const tags = new Set();
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('reward')) tags.add('reward');
  if (lowerMsg.includes('clan') || lowerMsg.includes('synergy')) tags.add('clan');
  if (lowerMsg.includes('rule') || lowerMsg.includes('ban')) tags.add('moderation');
  
  return Array.from(tags);
}

async function getSemanticMemory(userId, guildId, userMessage) {
  try {
    const queryVector = await embeddingService.getEmbedding(userMessage);
    if (!queryVector || queryVector.length === 0) return [];

    const pipeline = [
      {
        $vectorSearch: {
          index: "memory_vector_index",
          path: "embedding",
          queryVector: queryVector,
          numCandidates: 50,
          limit: 5
        }
      },
      {
        $match: {
          userId: userId,
          guildId: guildId
        }
      }
    ];

    return await UserMemory.aggregate(pipeline);
  } catch (error) {
    console.error("[SEMANTIC MEMORY] Search Failed:", error.message);
    return [];
  }
}

function arbitrateMemory(memories, contextTags) {
  if (!memories || memories.length === 0) return [];
  
  const currentTime = Date.now();
  const contextTagsSet = new Set(contextTags || []);

  const scoredMemories = memories.map(mem => {
    let score = 0;
    
    score += (mem.importance || 0) * 0.4;
    
    if (mem.semanticRank) {
      score += 0.3;
    }
    
    let tagMatch = false;
    if (mem.tags && Array.isArray(mem.tags)) {
      for (const t of mem.tags) {
        if (contextTagsSet.has(t)) {
          tagMatch = true;
          break;
        }
      }
    }
    if (tagMatch) score += 0.2;
    
    if (mem.type === 'event') score += 0.2;
    else if (mem.type === 'behavior') score += 0.1;
    else if (mem.type === 'preference') score += 0.05;
    
    if (!tagMatch && !mem.semanticRank) score -= 0.3;
    if ((mem.importance || 0) < 0.6) score -= 0.5;

    const ageInDays = (currentTime - new Date(mem.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    const decay = 1 / (1 + ageInDays);
    score *= decay;
    
    return { ...mem, finalScore: score };
  });

  const filtered = scoredMemories.filter(m => m.finalScore >= 0.3);
  filtered.sort((a, b) => b.finalScore - a.finalScore);
  
  return filtered.slice(0, 5);
}

async function getRelevantMemory(userId, guildId, userMessage) {
  try {
    const semanticResults = await getSemanticMemory(userId, guildId, userMessage);
    
    const contextTags = extractContextTags(userMessage);
    let query = { userId, guildId };
    if (contextTags.length > 0) {
      query.tags = { $in: contextTags };
    }
    
    let tagResults = await UserMemory.find(query);
    if (tagResults.length === 0 && contextTags.length > 0) {
      query = { userId, guildId };
      tagResults = await UserMemory.find(query);
    }

    const combinedMap = new Map();
    tagResults.forEach(mem => {
      combinedMap.set(mem._id.toString(), mem);
    });
    
    semanticResults.forEach((mem, index) => {
      if (mem._id) {
        mem.semanticRank = 5 - index; // higher is better
        combinedMap.set(mem._id.toString(), mem);
      }
    });

    let combined = Array.from(combinedMap.values());
    if (combined.length === 0) return [];

    const filtered = arbitrateMemory(combined, contextTags);

    logger.info("[MEMORY ARBITRATION]", {
      before: combined.length,
      after: filtered.length
    });

    return filtered.map(mem => mem.content);
  } catch (err) {
    console.error("[MEMORY] Hybrid Retrieval Error:", err.message);
    return [];
  }
}

module.exports = {
  analyzeMessage,
  storeMemory,
  getRelevantMemory
};
