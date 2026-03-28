const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  prefix: { type: String, default: "j" },
  
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String },
    message: { type: String, default: "Welcome to the server, {user}!" }
  },
  
  plugins: {
    clan: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
    leveling: { type: Boolean, default: true },
    inviteTrackerAdvanced: { type: Boolean, default: true },
    market: { type: Boolean, default: true },
    "clan-battle": { type: Boolean, default: true },
    "seasonal-synergy": { type: Boolean, default: true },
    "intra-match": { type: Boolean, default: true },
    "card-database": { type: Boolean, default: true },
    tempvc: { type: Boolean, default: true },
    teamup: { type: Boolean, default: true },
    audit: { type: Boolean, default: true },
    counting: { type: Boolean, default: true },
    channelManagement: { type: Boolean, default: true },
    "foster-program": { type: Boolean, default: true },
    "member-classification": { type: Boolean, default: true },
    utility: { type: Boolean, default: true },
    "card-exchange": { type: Boolean, default: true },
    admin: { type: Boolean, default: true },
    emoji: { type: Boolean, default: true },
    fun: { type: Boolean, default: true },
    games: { type: Boolean, default: true },
    packs: { type: Boolean, default: true },
    roles: { type: Boolean, default: true },
    sticker: { type: Boolean, default: true },
    triggers: { type: Boolean, default: true }
  },


  
  settings: {
    logChannelId: { type: String },
    autoRoleId: { type: String },
    modLogChannelId: { type: String },
    inviteLogChannelId: { type: String },
    marketLogChannelId: { type: String },
    dealCategoryId: { type: String },

    
    // Feature Channels
    classificationChannelId: { type: String },
    fosterChannelId: { type: String },
    countingChannelId: { type: String },
    cardExchangeChannelId: { type: String },
    marketChannelId: { type: String },
    clanBattleChannelId: { type: String },
    synergyChannelId: { type: String },
    intraAnnounceChannelId: { type: String },
    cardDatabaseChannelId: { type: String },
    tempvcCreateChannelId: { type: String },
    tempvcPanelChannelId: { type: String },
    tempvcCategoryId: { type: String },
    teamupChannelId: { type: String },
    generalChannelId: { type: String },
    mediaChannelId: { type: String },
    linksChannelId: { type: String },
    botCommandsChannelId: { type: String },
    xpIgnoreChannels: { type: [String], default: [] },

    // Feature Roles
    clanMemberRoleId: { type: String },
    newbieRoleId: { type: String },
    discordMemberRoleId: { type: String },
    ownerRoleId: { type: String },
    managerRoleId: { type: String },
    adminRoleId: { type: String },
    contributorRoleId: { type: String },
    mentorRoleId: { type: String },
    rookieRoleId: { type: String },
    synergyRoleId: { type: String },
    traderRoleId: { type: String },
    marketRoleId: { type: String },
    weeklyMvpRoleId: { type: String },
    seasonWinnerRoleId: { type: String },
    intraParticipateRoleId: { type: String },
    intraWinnerRoleId: { type: String },
    clanBattleWinnerRoleId: { type: String },
    teamupRoleId: { type: String },

    // Maps
    levelRoles: { type: Map, of: String, default: {} }
  }
}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);