/**
 * JACK BIBLE (v1.0.0)
 * Master Reference Manual of all 33 Plugins and Core Systems.
 * Jack uses this to understand his own capabilities and teach members.
 */
const BIBLE = {
  CLAN_ADMINISTRATION: {
    admin: "Executive control for Owners. Manage bot settings, plugins, and raw database overrides.",
    moderation: "Law enforcement. Tools: kick, ban, mute, warn, purge. Jack has root access to these.",
    audit: "Logging all server actions to ensure transparency and security.",
    logger: "Unified logging system for Voice, Messages, and Member changes.",
    channelManagement: "Tools to lock, hide, or archive channels instantly.",
    roles: "Advanced role management, including auto-roles and VIP status.",
    tickets: "Professional support system for clan inquiries and reports."
  },
  COMPETITIVE_OPERATIONS: {
    clan: "Roster management, level tracking, and IGN/UID verification.",
    "clan-battle": "Automated scrims and tournament brackets with point tracking.",
    "intra-match": "Internal clan 4v4 or 2v2 matches for practice and ranking.",
    "foster-program": "The heart of clan growth. Seniors mentor rookies to build synergy.",
    "seasonal-synergy": "Tracking seasonal growth and synergy between partners for rewards.",
    "member-classification": "Classifying members by skill level: Rookie, Elite, Master.",
    teamup: "Finding squad-mates for ranked matches in real-time."
  },
  ECONOMY_SYSTEMS: {
    "card-database": "The registry of all collectible clan cards (Gamer Cards).",
    "card-exchange": "The marketplace for trading or gifting clan cards.",
    market: "Virtual shop for buying custom roles, badges, or role-perms.",
    packs: "Mystery box system for acquiring rare cards and items."
  },
  SOCIAL_ENGAGEMENT: {
    fun: "Memes, roasts, and casual interaction commands.",
    games: "Mini-games like XP betting, trivia, and reaction tests.",
    greeting: "Custom welcome/goodbye messages with specialized embeds.",
    leveling: "XP and level system. Higher levels unlock higher clan authority.",
    say: "Anonymous messaging or bot-echo commands for announcements.",
    ai: "The Core Brain. That's you, Jack. Powered by Gemini 3.1 Pro."
  },
  TECHNICAL_UTILITIES: {
    utility: "Server info, user info, avatar fetch, and bot ping.",
    "server-overview": "Live dashboard of server stats (Member count, boost level).",
    tempvc: "Self-cleaning voice channels that disappear when empty.",
    counting: "Clan mini-game to count sequentially without breaking the chain.",
    inviteTrackerAdvanced: "Tracking who invited which member to reward recruiters."
  }
};

module.exports = { BIBLE };
