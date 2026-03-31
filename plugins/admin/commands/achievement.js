const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require('discord.js');
const Player = require('../../../bot/database/models/Player');
const profileService = require('../../clan/services/profileService');

module.exports = {
  name: "achievement",
  category: "admin",
  description: "Manually edit a player's achievements (Owner Only)",
  usage: "/achievement edit <user>",

  data: new SlashCommandBuilder()
    .setName("achievement")
    .setDescription("Manage player achievements")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName("edit")
        .setDescription("Open the achievement editor for a player")
        .addUserOption(o => o.setName("user").setDescription("The player to edit").setRequired(true))
    ),

  async run(ctx) {
    // Only the server owner can use this command
    if (ctx.user.id !== ctx.guild.ownerId) {
      return ctx.reply({ content: "❌ This command is restricted to the **Server Owner** only.", ephemeral: true });
    }

    const targetUser = ctx.options.getUser("user");
    
    // Function to build the control panel embed
    const buildControlPanel = async () => {
      const player = await profileService.getProfile(targetUser.id);
      const ach = player?.achievements || {};
      
      return new EmbedBuilder()
        .setTitle(`🏆 Achievement Editor: ${targetUser.username}`)
        .setColor("Gold")
        .setThumbnail(targetUser.displayAvatarURL())
        .setDescription(`Select a category below to edit achievements for <@${targetUser.id}>.`)
        .addFields(
          { name: "⚔️ Combat Stats", value: 
              `Intra Wins: **${ach.intraWins || 0}**\n` +
              `Clan Battle Wins: **${ach.clanBattleWins || 0}**\n` +
              `Best CB Rank: **${ach.bestClanBattleRank || 'N/A'}**`, inline: true },
          { name: "🤝 Social & Synergy", value: 
              `Foster Wins: **${ach.fosterWins || 0}**\n` +
              `Foster Partic.: **${ach.fosterParticipation || 0}**\n` +
              `Weekly MVP: **${ach.weeklyMVPCount || 0}**\n` +
              `Season Rank: **${ach.highestSeasonRank || 'N/A'}**`, inline: true }
        )
        .setFooter({ text: "Changes take effect immediately after saving." })
        .setTimestamp();
    };

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ach_edit_combat_${targetUser.id}`)
        .setLabel("Edit Combat")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("⚔️"),
      new ButtonBuilder()
        .setCustomId(`ach_edit_social_${targetUser.id}`)
        .setLabel("Edit Social")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🤝")
    );

    const message = await ctx.reply({ 
      embeds: [await buildControlPanel()], 
      components: [buttons],
      fetchReply: true 
    });

    // Create a collector for the buttons
    const collector = message.createMessageComponentCollector({ 
      filter: i => i.user.id === ctx.user.id,
      time: 600000 // 10 minutes
    });

    collector.on('collect', async i => {
      // Re-fetch profile to get latest values
      const player = await profileService.getProfile(targetUser.id);
      const ach = player?.achievements || {};

      if (i.customId.startsWith('ach_edit_combat_')) {
        const modal = new ModalBuilder()
          .setCustomId(`ach_modal_combat_${targetUser.id}_${Date.now()}`)
          .setTitle(`Edit Combat: ${targetUser.username}`);

        const intra = new TextInputBuilder()
          .setCustomId('intraWins')
          .setLabel('Intra Wins')
          .setValue(String(ach.intraWins || 0))
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const cbWins = new TextInputBuilder()
          .setCustomId('clanBattleWins')
          .setLabel('Clan Battle Wins')
          .setValue(String(ach.clanBattleWins || 0))
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const cbRank = new TextInputBuilder()
          .setCustomId('bestClanBattleRank')
          .setLabel('Best CB Rank (0 for N/A)')
          .setValue(String(ach.bestClanBattleRank || 0))
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(intra),
          new ActionRowBuilder().addComponents(cbWins),
          new ActionRowBuilder().addComponents(cbRank)
        );

        await i.showModal(modal);

        // Wait for modal submission
        try {
          const submitted = await i.awaitModalSubmit({
            filter: mi => mi.customId === modal.data.custom_id && mi.user.id === i.user.id,
            time: 300000
          });

          const updates = {
            "achievements.intraWins": parseInt(submitted.fields.getTextInputValue('intraWins')) || 0,
            "achievements.clanBattleWins": parseInt(submitted.fields.getTextInputValue('clanBattleWins')) || 0,
            "achievements.bestClanBattleRank": parseInt(submitted.fields.getTextInputValue('bestClanBattleRank')) || 0
          };

          await Player.findOneAndUpdate({ discordId: targetUser.id }, { $set: updates }, { upsert: true });

          await submitted.reply({ content: `✅ Combat stats updated for **${targetUser.username}**!`, ephemeral: true });
          
          // Refresh the main panel
          await message.edit({ embeds: [await buildControlPanel()] }).catch(() => null);
        } catch (err) {
          console.error('[AchievementModal] Combat Submit Error:', err.message);
        }
      } 
      else if (i.customId.startsWith('ach_edit_social_')) {
        const modal = new ModalBuilder()
          .setCustomId(`ach_modal_social_${targetUser.id}_${Date.now()}`)
          .setTitle(`Edit Social: ${targetUser.username}`);

        const fosterWins = new TextInputBuilder()
          .setCustomId('fosterWins')
          .setLabel('Foster Wins')
          .setValue(String(ach.fosterWins || 0))
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const fosterPart = new TextInputBuilder()
          .setCustomId('fosterParticipation')
          .setLabel('Foster Participation')
          .setValue(String(ach.fosterParticipation || 0))
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const mvp = new TextInputBuilder()
          .setCustomId('weeklyMVPCount')
          .setLabel('Weekly MVP Count')
          .setValue(String(ach.weeklyMVPCount || 0))
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const seasonRank = new TextInputBuilder()
          .setCustomId('highestSeasonRank')
          .setLabel('Season Rank (0 for N/A)')
          .setValue(String(ach.highestSeasonRank || 0))
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(fosterWins),
          new ActionRowBuilder().addComponents(fosterPart),
          new ActionRowBuilder().addComponents(mvp),
          new ActionRowBuilder().addComponents(seasonRank)
        );

        await i.showModal(modal);

        // Wait for modal submission
        try {
          const submitted = await i.awaitModalSubmit({
            filter: mi => mi.customId === modal.data.custom_id && mi.user.id === i.user.id,
            time: 300000
          });

          const updates = {
            "achievements.fosterWins": parseInt(submitted.fields.getTextInputValue('fosterWins')) || 0,
            "achievements.fosterParticipation": parseInt(submitted.fields.getTextInputValue('fosterParticipation')) || 0,
            "achievements.weeklyMVPCount": parseInt(submitted.fields.getTextInputValue('weeklyMVPCount')) || 0,
            "achievements.highestSeasonRank": parseInt(submitted.fields.getTextInputValue('highestSeasonRank')) || 0
          };

          await Player.findOneAndUpdate({ discordId: targetUser.id }, { $set: updates }, { upsert: true });

          await submitted.reply({ content: `✅ Social stats updated for **${targetUser.username}**!`, ephemeral: true });
          
          // Refresh the main panel
          await message.edit({ embeds: [await buildControlPanel()] }).catch(() => null);
        } catch (err) {
          console.error('[AchievementModal] Social Submit Error:', err.message);
        }
      }
    });

    collector.on('end', () => {
      const disabledButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('d1').setLabel('Edit Combat').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('d2').setLabel('Edit Social').setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      message.edit({ components: [disabledButtons] }).catch(() => null);
    });
  }
};
