const mongoose = require('mongoose');
const { BIBLE } = require('./systemBible');
const userProfile = require('../../core/memory/userProfile');
const systemContext = require('../../core/systemContext');

/**
 * CLAN CONTEXT (v5.0.0) - ADAPTIVE SYSTEM AWARENESS
 * Aggregates live data, Bible rules, Unified User Profiles, and System Awareness.
 */
async function getClanContext(guild, member = null) {
  try {
    let context = "### JACK'S HOLY BIBLE (Plugin Summary) ###\n";
    let reputationScore = 0;
    
    // 0. SYSTEM AWARENESS (New Component)
    const sys = systemContext.getSystemContext();
    context = `### SYSTEM AWARENESS: ${sys.name} v${sys.version} ###\n`;
    context += `[Capabilities]: ${Object.keys(sys.capabilities).join(', ')}\n\n`;
    
    context += "### JACK'S HOLY BIBLE (Plugin Summary) ###\n";
    
    // 1. SYSTEM BIBLE
    Object.entries(BIBLE).forEach(([category, plugins]) => {
      context += `[${category}]: ${Object.values(plugins).join('; ')}\n`;
    });

    context += "\n### LIVE CLAN STATUS ###\n";

    // 2. Battle & Foster Status
    try {
      const FosterProgram = mongoose.model('FosterProgram');
      const activePairs = await FosterProgram.countDocuments({ status: 'active' });
      context += `- Foster Program: ${activePairs} active mentor/rookie pairs.\n`;
    } catch (e) {}

    // 3. UNIFIED USER DOSSIER
    if (member) {
      const profile = await userProfile.getFullProfile(member.id, guild);
      
      if (!profile.error) {
        reputationScore = profile.personality?.reputation || 0;
        context += `\n### TARGET MEMBER DOSSIER: ${profile.basic.username} ###\n`;
        context += "```json\n" + JSON.stringify(profile, null, 2) + "\n```\n";
      } else {
        context += `\n### TARGET MEMBER: ${member.user.tag} (Profile Unavailable) ###\n`;
      }
    }

    context += `\n- CURRENT TIME: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
    context += `- Members in Server: ${guild.memberCount}\n`;

    return { context, reputationScore };
  } catch (err) {
    console.error("[ClanContext] Neural Failure:", err.message);
    return { context: "Memory Access Error.", reputationScore: 0 };
  }
}

module.exports = { getClanContext };
