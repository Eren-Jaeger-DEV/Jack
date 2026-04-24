const { PermissionFlagsBits } = require("discord.js");

const { OWNER_IDS } = require("../constants");
// Channel IDs where Jack can send proactive pings
const AI_SANDBOX_CHANNEL_ID = "1488453630184132729";

module.exports = {
  schema: {
    "name": "send_proactive_ping",
    "description": "PROACTIVE: Send an unprompted message to the AI channel or DM the Supreme Manager. Use this AFTER finishing a multi-step task to report results, when you notice something critical, or when you want to provide an update without waiting for a question. Do NOT overuse — only ping when it genuinely adds value.",
    "parameters": {
      "type": "OBJECT",
      "properties": {
        "message": {
          "type": "STRING",
          "description": "The message content to send proactively."
        },
        "urgency": {
          "type": "STRING",
          "description": "low | medium | high — controls whether to also DM the Supreme Manager. 'low' = channel only, 'medium' = channel only, 'high' = channel + DM."
        },
        "also_dm": {
          "type": "BOOLEAN",
          "description": "Set to true to also send this message as a DM to the Supreme Manager. Use only for high-urgency notifications."
        }
      },
      "required": ["message", "urgency"]
    }
  },

  /**
   * PROACTIVE MESSAGING: Jack calls this to send a message without being prompted.
   * The client is injected via args._client by the tool dispatcher.
   */
  async execute(args, invoker, guild) {
    const { message, urgency = "low", also_dm = false } = args;
    const client = args._client;

    if (!OWNER_IDS.includes(invoker.id)) {
      return { success: false, message: "Unauthorized. Only the Supreme Manager can trigger proactive pings." };
    }

    if (!client) {
      return { success: false, message: "Client not available in this context." };
    }

    const urgencyEmoji = {
      low:    "💬",
      medium: "⚠️",
      high:   "🚨"
    }[urgency] || "💬";

    const formattedMessage = `${urgencyEmoji} **[JACK — PROACTIVE UPDATE]**\n${message}`;

    const results = [];

    // 1. Send to the sandbox AI channel
    try {
      const channel = await client.channels.fetch(AI_SANDBOX_CHANNEL_ID).catch(() => null);
      if (channel && channel.isTextBased()) {
        await channel.send(formattedMessage);
        results.push("sandbox channel");
      }
    } catch (e) {
      results.push(`channel failed: ${e.message}`);
    }

    // 2. Optionally DM the owner (high urgency or explicitly requested)
    if (also_dm || urgency === "high") {
      try {
        const ownerId = OWNER_IDS[0]; // Primary owner
        if (ownerId) {
          const ownerUser = await client.users.fetch(ownerId).catch(() => null);
          if (ownerUser) {
            const dmChannel = await ownerUser.createDM().catch(() => null);
            if (dmChannel) {
              await dmChannel.send(formattedMessage);
              results.push("DM");
            }
          }
        }
      } catch (e) {
        results.push(`DM failed: ${e.message}`);
      }
    }

    return {
      success: results.length > 0,
      message: `Proactive ping sent to: ${results.join(", ")}`
    };
  }
};
