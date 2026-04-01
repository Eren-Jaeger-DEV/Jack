const mongoose = require('mongoose');
const { BIBLE } = require('./systemBible');

/**
 * CLAN CONTEXT (v3.0.0) - SUPREME MEMORY INTEGRATION
 * Aggregates live data, Bible rules, and Personality Diary for the AI.
 */
async function getClanContext(guild, member = null) {
  try {
    let context = "### JACK'S HOLY BIBLE (Plugin Summary) ###\n";
    let reputationScore = 0;
    
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

    // 3. TARGET USER RECOGNITION (Player Data & Diary)
    if (member) {
      context += `\n### TARGET MEMBER DOSSIER: ${member.user.tag} ###\n`;
      
      // A. Player Profile (Game Data)
      try {
        const Player = mongoose.model('Player');
        const player = await Player.findOne({ discordId: member.id });
        if (player) {
          context += `- IGN: ${player.ign}\n`;
          context += `- Season Synergy: ${player.seasonSynergy}\n`;
          context += `- Role: ${player.role}\n`;
          context += `- Status: ${player.isClanMember ? 'Clan Member' : 'Outsider'}\n`;
        }
      } catch (e) { /* Model not found */ }

      // B. Member Diary (AI Memory)
      try {
        const MemberDiary = mongoose.model('MemberDiary');
        const diary = await MemberDiary.findOne({ discordId: member.id });
        if (diary) {
          reputationScore = diary.reputationScore;
          context += `- Personality: ${diary.personalityProfile}\n`;
          context += `- Reputation: ${diary.reputationScore} (Scale: -100 to +100)\n`;
          context += `- Interaction Count: ${diary.interactionCount}\n`;
          context += `- Jack's Internal Notes: ${diary.notes.split('\n').slice(-3).join('\n')}\n`;
        } else {
          context += `- Reputation: 0 (New User)\n`;
          context += `- Personality: Professional assessment required.\n`;
        }
      } catch (e) { /* Model not found */ }
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
