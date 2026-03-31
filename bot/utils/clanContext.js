const mongoose = require('mongoose');
const { BIBLE } = require('./systemBible');

/**
 * CLAN CONTEXT (v3.0.0) - SUPREME MEMORY INTEGRATION
 * Aggregates live data, Bible rules, and Personality Diary for the AI.
 */
async function getClanContext(guild, member = null) {
  try {
    let context = "### JACK'S HOLY BIBLE (Plugin Summary) ###\n";
    
    // 1. SYSTEM BIBLE: Integrated System Knowledge
    Object.entries(BIBLE).forEach(([category, plugins]) => {
      context += `[${category}]: ${Object.values(plugins).join('; ')}\n`;
    });

    context += "\n### LIVE CLAN STATUS ###\n";

    // 2. Battle & Foster Status (Aggregated)
    try {
      const FosterProgram = mongoose.model('FosterProgram');
      const activePairs = await FosterProgram.countDocuments({ status: 'active' });
      context += `- Foster Program: ${activePairs} active mentor/rookie pairs.\n`;
    } catch (e) { /* Model not found */ }

    // 3. MEMBER DIARY: Personality & Memory
    if (member) {
      context += `\n### TARGET MEMBER PROFILE: ${member.user.tag} ###\n`;
      try {
        const MemberDiary = mongoose.model('MemberDiary');
        const diary = await MemberDiary.findOne({ discordId: member.id });
        if (diary) {
          context += `- Personality: ${diary.personalityProfile}\n`;
          context += `- Reputation: ${diary.reputationScore} (Scale: -100 to +100)\n`;
          context += `- Interaction Count: ${diary.interactionCount}\n`;
          context += `- Jack's Notes: ${diary.notes.split('\n').slice(-3).join('\n')}\n`; // Last 3 notes
        } else {
          context += `- Personality: New User. Unidentified.\n`;
        }
      } catch (e) { /* Model not found */ }
    }

    context += `\n- CURRENT TIME: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
    context += `- Members in Server: ${guild.memberCount}\n`;

    return context;
  } catch (err) {
    console.error("[ClanContext] Neural Failure:", err.message);
    return "Memory Access Error.";
  }
}

module.exports = { getClanContext };
