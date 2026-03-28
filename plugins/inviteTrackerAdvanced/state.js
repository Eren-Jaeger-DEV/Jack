module.exports = {
    inviteCache: new Map(), // guildId -> Map(inviteCode -> uses)
    raidCheck: new Map(),   // inviterId -> [timestamps]
    
    // Constants
    FAKE_THRESHOLD_MS: 10 * 60 * 1000 // 10 minutes
};
