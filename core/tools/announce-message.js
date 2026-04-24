const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const { PermissionFlagsBits, EmbedBuilder } = require("discord.js");


module.exports = {
  schema: {
    "name": "announce_message",
    "description": "BROADCASTER: Send a formatted announcement Embed to a specific channel.",
    "parameters": {
        "type": "OBJECT",
        "properties": {
            "channel_id": {
                "type": "STRING"
            },
            "title": {
                "type": "STRING"
            },
            "description": {
                "type": "STRING"
            },
            "color": {
                "type": "STRING"
            }
        },
        "required": [
            "channel_id",
            "title",
            "description"
        ]
    }
},

  /**
   * BROADCASTER: Send a formatted announcement to a channel.
   */
  async execute(args, invoker, guild) {
    const { channel_id, title, description, color = "#00BFFF" } = args;
    if (!(await this._checkPower(invoker, guild, [PermissionFlagsBits.Administrator]))) {
      return { success: false, message: "Unauthorized. Only Administrators can broadcast announcements." };
    }
    try {
      const channel = guild.channels.cache.get(this._sanitizeId(channel_id));
      if (!channel) return { success: false, message: `Channel not found: ${channel_id}` };
      
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: "Clan Broadcast • Automated by Jack" });
        
      await channel.send({ embeds: [embed] });
      return { success: true, message: `Announcement successfully sent to ${channel.name}.` };
    } catch (e) {
      return { success: false, message: `Announcement failed: ${e.message}` };
    }
  }
};
