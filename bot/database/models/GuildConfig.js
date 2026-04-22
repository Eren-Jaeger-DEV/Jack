const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  prefix: { type: String, default: "j" },
  
  greetingData: {
    welcomeEnabled: { type: Boolean, default: false },
    welcomeChannelId: { type: String, default: null },
    welcomeMessage: { type: String, default: '⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘\nYou are the {memberCount}th member here.\n✦ Chatting Area ✦\n➤ <#1341978656096129065>\n✦ Read Rules ✦\n➤ <#1477894453300559957>\n✦ Self Roles ✦\n➤ <#1408839027771048148>\n✦ Server Info. ✦\n➤ <#1477894589565374667>\n⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘' },
    welcomeImage: { type: String, default: 'https://cdn.discordapp.com/attachments/1353964404378701916/1394935239557517322/standard_1.gif' },
    
    goodbyeEnabled: { type: Boolean, default: false },
    goodbyeChannelId: { type: String, default: null },
    goodbyeMessage: { type: String, default: '**Goodbye Mate!!**\n\nThank You for spending time with us.' },
    goodbyeImage: { type: String, default: 'https://cdn.discordapp.com/attachments/1353964404378701916/1402495184943452170/standard_2.gif' }
  },

  moderation: {
    antiLink: { type: Boolean, default: false },
    antiSpam: { type: Boolean, default: false },
    blacklistedWords: { type: [String], default: [] },
    maxMentions: { type: Number, default: 5 },
    muteRoleId: { type: String, default: null }
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
    infrastructure: { type: Boolean, default: true },
    utility: { type: Boolean, default: true },
    "card-exchange": { type: Boolean, default: true },
    admin: { type: Boolean, default: true },
    emoji: { type: Boolean, default: true },
    fun: { type: Boolean, default: true },
    games: { type: Boolean, default: true },
    packs: { type: Boolean, default: true },
    roles: { type: Boolean, default: true },
    sticker: { type: Boolean, default: true },
    triggers: { type: Boolean, default: true },
    prefix: { type: Boolean, default: true },
    greeting: { type: Boolean, default: true },
    ai: { type: Boolean, default: true }
  },


  
  settings: {
    logChannelId: { type: String },
    voiceLogChannelId: { type: String },
    autoRoleId: { type: String },
    modLogChannelId: { type: String },
    inviteLogChannelId: { type: String },
    marketLogChannelId: { type: String },
    messageLogChannelId: { type: String },
    joinLeaveLogChannelId: { type: String },
    memberLogChannelId: { type: String },
    serverLogChannelId: { type: String },
    ticketsLogChannelId: { type: String },
    popLogChannelId: { type: String },
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
    aiChannelId: { type: String },
    trustChannelId: { type: String },
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
    registrationChannelId: { type: String },
    trustedRoleId: { type: String },
    
    // HYBRID AI CONTROLLER
    aiEnabled: { type: Boolean, default: true },
    aiChannelId: { type: String },

    // PERSONALITY ENGINE V2
    personality: {
      tone: { type: String, default: "calm" },
      humor: { type: Number, default: 10 },
      strictness: { type: Number, default: 60 },
      verbosity: { type: Number, default: 40 },
      respect_bias: { type: Number, default: 60 }
    },

    // Maps
    levelRoles: { type: Map, of: String, default: {
      "1": "1477868599686336643",
      "5": "1477869156367077559",
      "10": "1477869258556964894",
      "15": "1477869451977429113",
      "20": "1477869710564524192",
      "30": "1477869846933798992",
      "40": "1477870041151311912"
    } }
  }
}, { timestamps: true });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);