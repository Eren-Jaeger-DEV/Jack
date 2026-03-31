const mongoose = require('mongoose');

/**
 * Aggregates live data from various plugins to provide 'ground truth' for the AI.
 * This prevents the model from hallucinating (bluffing) about clan stats.
 */
async function getClanContext(guild) {
  try {
    let context = "CLAN STATUS SUMMARY:\n";

    // 1. Clan Battle Data (if model exists)
    try {
      const Battle = mongoose.model('Battle');
      const activeBattle = await Battle.findOne({ status: 'active' }).sort({ createdAt: -1 });
      if (activeBattle) {
        context += `- Active Clan Battle: ${activeBattle.name}\n`;
        context += `  Standings: ${activeBattle.teamA.name} vs ${activeBattle.teamB.name}\n`;
      } else {
        context += `- No active Clan Battle at the moment.\n`;
      }
    } catch (e) { /* Model not loaded or doesn't exist */ }

    // 2. Foster Program Data
    try {
      const FosterProgram = mongoose.model('FosterProgram');
      const activePairs = await FosterProgram.countDocuments({ status: 'active' });
      context += `- Foster Program: ${activePairs} active mentor/rookie pairs.\n`;
    } catch (e) { /* Skip if model not found */ }

    // 3. General Server Info & TRUE TIME
    context += `- CURRENT SERVER TIME: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
    context += `- Total Clan Members: ${guild.memberCount}\n`;
    context += `- Server Name: ${guild.name}\n`;

    return context;
  } catch (err) {
    console.error("[ClanContext] Error fetching context:", err.message);
    return "Error fetching live clan data.";
  }
}

module.exports = { getClanContext };
