const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const ReactionRolePanel = require("../database/models/ReactionRolePanel");

/**
 * Rebuilds the buttons and embed for a specific reaction role panel and updates the message.
 * @param {import('discord.js').Client} client 
 * @param {string} panelID 
 */
async function refreshReactionRolePanel(client, panelID) {
  try {
    const panel = await ReactionRolePanel.findOne({ panelID });
    if (!panel) return;

    const channel = await client.channels.fetch(panel.channelID).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(panel.messageID).catch(() => null);
    if (!message) return;

    const embed = new EmbedBuilder()
      .setTitle(panel.title)
      .setDescription(panel.description)
      .setColor(panel.color || "Blue")
      .setFooter({ text: "Click the buttons below to receive your roles!" });

    const components = [];
    
    if (panel.roles && panel.roles.length > 0) {
      let currentRow = new ActionRowBuilder();

      for (const [index, roleData] of panel.roles.entries()) {
        // Discord allows max 5 buttons per row, 5 rows per message (25 buttons max)
        if (index > 0 && index % 5 === 0) {
          components.push(currentRow);
          currentRow = new ActionRowBuilder();
        }

        const button = new ButtonBuilder()
          .setCustomId(`rr_assign_${panelID}_${roleData.roleID}`)
          .setStyle(ButtonStyle.Secondary);

        if (roleData.label) button.setLabel(roleData.label);
        if (roleData.emoji) button.setEmoji(roleData.emoji);
        
        // Failsafe: A button must have either a label or an emoji
        if (!roleData.label && !roleData.emoji) {
           button.setLabel("Role");
        }

        currentRow.addComponents(button);
      }
      
      if (currentRow.components.length > 0) {
        components.push(currentRow);
      }
    }

    await message.edit({ embeds: [embed], components });

  } catch (error) {
    console.error(`Failed to refresh Reaction Role Panel [${panelID}]:`, error);
  }
}

module.exports = { refreshReactionRolePanel };
