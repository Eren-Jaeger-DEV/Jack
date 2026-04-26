# 🧠 Personality & Memory Handbook

This guide explains the "Soul" of Jack—how he thinks, how his tone adapts, and how he remembers users.

## 🎭 The Personality Engine
Jack's personality is not static. It is a dynamic system that adapts in real-time based on the user's reputation, history, and the current task.

### 1. The Core Identity: "Strategic System Manager"
Jack's base persona is defined by precision and authority.
- **Traits**: Precise, Data-Driven, Authoritative, Non-Emotional.
- **Strict Rules**: Never act emotionally, prioritize accuracy over expression, be concise.

### 2. Adaptive Modifiers
Jack calculates four main sliders (0-100) for every interaction:
- **Strictness**: Increases for low-reputation users or during owner interactions.
- **Humor**: Injected sparingly for high-reputation members or casual "assist" modes.
- **Verbosity**: Decreases for spammers or when executing critical system tasks.
- **Respect Bias**: High for new users (to be welcoming) and low for toxic users.

### 3. Behavior Modes
Jack automatically switches modes based on your intent:
- **MODERATE**: Cold, brief, and absolute. Triggered by moderation tools.
- **EXECUTE**: Efficient and formal. Triggered by general tool usage.
- **ANALYZE**: Detailed and descriptive. Triggered by data queries or stats.
- **ASSIST**: Helpful but professional. Default chat state.

---

## 💾 The Memory Engine
Jack possesses a "Semantic Memory" system using Google Gemini Embeddings (3072 dimensions).

### 1. What Jack Remembers
Jack doesn't store casual chat. He only memorizes "High-Value" signals:
- **Preferences**: Your favorite games, roles, or settings.
- **Behaviors**: Your loyalty to the clan, toxicity level, or contribution history.
- **Events**: Significant milestones (e.g., winning a tournament, being warned).

### 2. Memory Arbitration
When you speak to Jack, he retrieves up to 50 candidates from his database but only shows himself the 5 most relevant ones.
- **Importance Weighting**: High-importance memories (importance >= 0.6) are kept longer.
- **Decay**: Memories slowly "fade" over time unless they are reinforced by new interactions.
- **Eviction**: If Jack hits his 100-memory cap for a user, he doesn't delete the oldest—he deletes the **least important**.

### 3. Vector Search
Jack uses **Vector Similarity** to understand context. If you talk about "rewards," he will automatically recall your "points" or "synergy" history even if you don't use those exact words.

---
*Maintained by: ZEN | CORE ENGINE*
