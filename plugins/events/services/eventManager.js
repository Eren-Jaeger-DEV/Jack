/**
 * eventManager.js
 *
 * Central registry for event type configurations.
 * Maps event types to their default channel IDs, role IDs, rewards, and max winner count.
 * All IDs are hardcoded per the server spec but can be overridden on creation.
 */

const EVENT_CONFIGS = {

  clanBattle: {
    name: 'Clan Battle',
    channelId: '1379098755592093787',
    roles: {
      winnerRoleId: '1477872032644599892',
      participantRoleId: null
    },
    maxWinners: 6,
    rewards: [
      { rank: 1, label: '₹225' },
      { rank: 2, label: '₹191' },
      { rank: 3, label: '₹151' },
      { rank: 4, label: '₹101' },
      { rank: 5, label: '₹89'  },
      { rank: 6, label: '₹55'  }
    ],
    claimMessage: '🎟️ To claim your prize, create a ticket from the ticket channel.'
  },

  intraMatch: {
    name: 'Intra Clan Match',
    channelId: '1379098950929219756',
    restrictedChannelId: '1397822880611303455', // for match info, restricted use
    roles: {
      winnerRoleId: '1477871908354654209',
      participantRoleId: '1477877148793573417'
    },
    maxWinners: 3,
    rewards: [],
    claimMessage: null
  },

  foster: {
    name: 'Foster Program',
    channelId: '1477150817021858047',
    roles: {
      winnerRoleId: null,
      participantRoleId: null
    },
    maxWinners: 1,
    rewards: [],
    claimMessage: null
  },

  seasonal: {
    name: 'Seasonal Synergy',
    channelId: '1477984930909786134',
    roles: {
      winnerRoleId: '1477872708925788201',
      participantRoleId: null
    },
    maxWinners: 3,
    rewards: [],
    claimMessage: null
  },

  fun: {
    name: 'Fun Custom Match',
    channelId: '1473927236104097913',
    roles: {
      winnerRoleId: '1477872136625586330',
      participantRoleId: null
    },
    maxWinners: 3,
    rewards: [],
    claimMessage: null
  }

};

/**
 * Returns full config for the given type.
 * @param {string} type
 */
function getEventConfig(type) {
  return EVENT_CONFIGS[type] || null;
}

/**
 * Returns a list of valid event types for slash command choices.
 */
function getEventTypes() {
  return Object.keys(EVENT_CONFIGS).map(key => ({
    name: EVENT_CONFIGS[key].name,
    value: key
  }));
}

/**
 * Generates a unique sequential event ID.
 * Format: "cb-001" / "fun-003" etc.
 * @param {string} type
 * @param {number} count - Total existing events of this type
 */
function generateEventId(type, count) {
  const prefix = type.substring(0, 3).toLowerCase();
  const num = String(count + 1).padStart(3, '0');
  return `${prefix}-${num}`;
}

module.exports = { getEventConfig, getEventTypes, generateEventId };
