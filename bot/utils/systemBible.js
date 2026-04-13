/**
 * JACK BIBLE (v1.0.0)
 * Master Reference Manual of all 33 Plugins and Core Systems.
 * Jack uses this to understand his own capabilities and teach members.
 */
const BIBLE = {
  CORE_ARCHITECTURES: {
    executor: "Lifecycle manager for commands. Handles security validation, cooldowns, and timeout protection.",
    validator: "Security layer. Checks user permissions against PermissionFlagsBits before execution.",
    observer: "Passive behavioral tracking. Records message activity, member growth, and success metrics.",
    logic: "The AI Controller (Core Brain) which integrates intent classification with tool execution."
  },
  CLAN_ADMINISTRATION: {
    admin: "Executive control for Owners. Commands: /hud, /config, /setup. Used for raw DB overrides.",
    moderation: "Law enforcement (Root Authority). Commands: /ban, /kick, /mute, /warn, /purge.",
    audit: "Deep logging of server events (Message edits/deletes, Role changes, Voice activity).",
    roles: "Advanced management. Auto-roles for newbies and specialized roles for Top 15 players.",
    tickets: "Integrated support system for handling clan disputes and recruitment interviews."
  },
  COMPETITIVE_OPERATIONS: {
    clan: "Roster integrity. Commands: /profile, /verify, /ign. Syncs Discord IDs with BGMI UIDs.",
    "clan-battle": "Strategic war room. Automated scrim brackets and tournament point tracking.",
    "foster-program": "Growth engine. Pairs Seniors (Mentors) with Rookies for 30-day growth cycles.",
    "seasonal-synergy": "Tracking growth between partners. Users submit '/hud' to see current synergy levels.",
    "member-classification": "Skill-based ranking system (Rookie, Elite, Master) derived from performance data."
  },
  ECONOMY_SYSTEMS: {
    "card-database": "The registry of Gamer Cards. Each card represents a clan legacy.",
    "pop-market": "Marketplace for trading Gamer Cards. Uses pagination and individual embeds for clarity.",
    packs: "RNG mystery boxes. Users spend XP to unlock rare cards or vanity roles.",
    market: "Buy specialized roles or server perks using clan reputation and activity points."
  },
  SOCIAL_ENGAGEMENT: {
    leveling: "Passive XP system. Rewards high-quality engagement with increased authority in the clan.",
    tempvc: "Self-cleaning voice channels. Created dynamically to keep the server map clean.",
    counting: "The 'Discipline Game'. A sequential counting challenge in specialized channels.",
    games: "Strategic mini-games (XP betting, trivia, and reaction tests) designed for clan bonding.",
    ai: "The Central Intelligence. Multi-key rotation (Gemini 3.1 Pro) with adaptive persona modules."
  }
};

module.exports = { BIBLE };
