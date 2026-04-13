const Player = require('../../../bot/database/models/Player');
const Level = require('../../../bot/database/models/Level');
const FosterProgram = require('../../foster-program/models/FosterProgram');
const xpForLevel = require('../../leveling/utils/xpForLevel');

/**
 * HUD DATA SERVICE
 * Aggregates multi-plugin status for a specific member.
 */
module.exports = {
    /**
     * Fetches comprehensive HUD data for a member.
     */
    async getMemberHUDData(guild, userId) {
        // 1. Fetch Basic Player Data
        const player = await Player.findOne({ discordId: userId });
        
        // 2. Fetch Leveling Data
        const levelData = await Level.findOne({ guildId: guild.id, userId });
        
        // 3. Fetch Foster Status
        const fosterProgram = await FosterProgram.findOne({ guildId: guild.id, active: true });
        let fosterPair = null;
        if (fosterProgram) {
            fosterPair = fosterProgram.pairs.find(p => p.mentorId === userId || p.partnerId === userId);
        }

        // 4. Calculate Leveling Progress
        const currentLevel = levelData?.level || 0;
        const currentXP = levelData?.xp || 0;
        const xpForCurrent = xpForLevel(currentLevel);
        const xpForNext = xpForLevel(currentLevel + 1);
        
        const nextLevelXP = xpForNext - xpForCurrent;
        const relXP = currentXP - xpForCurrent;
        const progressPercent = Math.min(100, Math.max(0, (relXP / nextLevelXP) * 100));

        // 5. Build Result
        return {
            ign: player?.ign || "Not Registered",
            synergy: {
                weekly: player?.weeklySynergy || 0,
                season: player?.seasonSynergy || 0
            },
            leveling: {
                level: currentLevel,
                xp: currentXP,
                progress: progressPercent.toFixed(1),
                xpToNext: nextLevelXP - relXP
            },
            foster: fosterPair ? {
                role: fosterPair.mentorId === userId ? "ADAPT / MENTOR" : "NEOPHYTE / PARTNER",
                partnerId: fosterPair.mentorId === userId ? fosterPair.partnerId : fosterPair.mentorId,
                points: fosterPair.points || 0
            } : null
        };
    }
};
