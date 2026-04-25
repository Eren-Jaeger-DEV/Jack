const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require('discord.js');
const { addLog } = require('../../utils/logger');
const configManager = require('../../bot/utils/configManager');
const path = require('path');

const CONFIG = {
  DATA_PATH: path.join(__dirname, 'data.json')
};

// Map of Voice Channel ID -> Owner User ID
const activeVCs = new Map();

async function initControlPanel(client) {
  try {
    let GUILD_ID = process.env.GUILD_ID;
    
    // Fallback: Use the first guild from config cache if GUILD_ID is not in .env
    if (!GUILD_ID) {
      const firstGuildId = Array.from(configManager.configCache.keys())[0];
      if (firstGuildId) GUILD_ID = firstGuildId;
    }

    if (!GUILD_ID) return;
    const config = await configManager.getGuildConfig(GUILD_ID);
    const panelChannelId = config?.settings?.tempvcPanelChannelId;
    if (!panelChannelId) return;

    const channel = await client.channels.fetch(panelChannelId).catch(() => null);
    if (!channel) return;

    // Check if message already exists
    const messages = await channel.messages.fetch({ limit: 10 });
    
    // 1. Check for the NEW V2 panel (type 20 is Container)
    const v2Panel = messages.find(m => 
      m.author.id === client.user.id && 
      m.flags.has(MessageFlags.IsComponentsV2)
    );

    if (v2Panel) {
      addLog("TempVC", "V2 Control panel ready");
      return;
    }

    // 2. Check for an OLD legacy panel and delete it to make room
    const oldPanel = messages.find(m => 
      m.author.id === client.user.id && 
      (m.embeds?.[0]?.title?.includes('Personal Voice Channel') || m.components?.[0]?.components?.[0]?.customId === 'tempvc_lock')
    );

    if (oldPanel) {
      addLog("TempVC", "Old panel detected, purging for upgrade...");
      await oldPanel.delete().catch(() => {});
    }

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('🎙️ **Personal Voice Channel Control Panel**')
    );

    container.addSeparatorComponents(new SeparatorBuilder());

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Use the buttons below to manage your personal voice channel.\n\n' +
        '🔒 **Lock** / 🔓 **Unlock**: Restrict or allow others from connecting.\n' +
        '👁️ **Hide** / 👻 **Show**: Hide or show your channel from others.\n' +
        '✏️ **Rename**: Toggle a "(Private)" tag on your channel name.\n' +
        '👥 **Limit**: Toggle user limit between 5 and Unlimited.\n' +
        '👢 **Kick**: Kick a random non-owner member from your VC.\n' +
        '👑 **Transfer**: Transfer ownership to a random member in your VC.\n\n' +
        '*Must be the VC owner to use these controls!*'
      )
    );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tempvc_lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tempvc_unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tempvc_hide').setLabel('Hide').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tempvc_show').setLabel('Show').setEmoji('👻').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tempvc_rename').setLabel('Rename').setEmoji('✏️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tempvc_limit').setLabel('Limit').setEmoji('👥').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tempvc_kick').setLabel('Kick').setEmoji('👢').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('tempvc_transfer').setLabel('Transfer').setEmoji('👑').setStyle(ButtonStyle.Success)
    );

    await channel.send({ 
        components: [container, row1, row2],
        flags: MessageFlags.IsComponentsV2
    });
    addLog("TempVC", "Control panel initialized");
  } catch (err) {
    console.error('[TempVC] Error initializing control panel:', err);
  }
}

module.exports = {
  load(client) {
    // Hidden to keep startup clean



    if (client.isReady()) {
      initControlPanel(client);
    } else {
      client.once('clientReady', () => initControlPanel(client));
    }

    // Voice State Tracker
    client.on('voiceStateUpdate', async (oldState, newState) => {

      const config = await configManager.getGuildConfig(newState.guild.id);

      const createVcId = config?.settings?.tempvcCreateChannelId;
      const categoryId = config?.settings?.tempvcCategoryId;

      // User Joined "Create VC"
      if ((!oldState.channelId && newState.channelId) || (oldState.channelId !== newState.channelId)) {
        if (createVcId && newState.channelId === createVcId) {
          const guild = newState.guild;
          const member = newState.member;

          try {
            const newChannel = await guild.channels.create({
              name: `${member.user.username}'s VC`,
              type: ChannelType.GuildVoice,
              parent: categoryId,
              permissionOverwrites: [
                {
                  id: guild.roles.everyone.id,
                  allow: [],
                  deny: []
                },
                {
                  id: member.id,
                  allow: ['ManageChannels', 'MoveMembers', 'Connect', 'Speak']
                }
              ]
            });

            activeVCs.set(newChannel.id, member.id);
            await member.voice.setChannel(newChannel);
          } catch (err) {
            console.error('[TempVC] Error creating VC:', err);
          }
        }
      }

      // Check for empty active VCs
      if (oldState.channelId && oldState.channelId !== newState.channelId) {
        const channel = oldState.channel;
        if (channel && activeVCs.has(channel.id)) {
          if (channel.members.size === 0) {
            try {
              await channel.delete('TempVC empty');
              activeVCs.delete(channel.id);
            } catch (err) {
              console.error('[TempVC] Error deleting VC:', err);
            }
          }
        }
      }
    });

    // Control Panel Button & Modal Handler
    client.on('interactionCreate', async (interaction) => {
      if (interaction.isModalSubmit() && interaction.customId === 'tempvc_rename_modal') {
        const member = interaction.member;
        const memberVC = member.voice.channel;
        
        if (!memberVC || !activeVCs.has(memberVC.id)) {
          return interaction.reply({ content: "❌ You must be in a personal VC to use this.", flags: [MessageFlags.Ephemeral] });
        }

        if (activeVCs.get(memberVC.id) !== member.id) {
          return interaction.reply({ content: "❌ You are no longer the owner of this VC.", flags: [MessageFlags.Ephemeral] });
        }

        try {
          const newName = interaction.fields.getTextInputValue('new_name');
          await memberVC.setName(newName);
          return await interaction.reply({ content: `✅ VC renamed to \`${newName}\`.`, flags: [MessageFlags.Ephemeral] });
        } catch (err) {
          console.error('[TempVC] Rename error:', err);
          return await interaction.reply({ content: "❌ Failed to rename channel.", flags: [MessageFlags.Ephemeral] }).catch(()=>null);
        }
      }

        if (interaction.isModalSubmit() && interaction.customId === 'tempvc_limit_modal') {
          const member = interaction.member;
          const memberVC = member.voice.channel;
          
          if (!memberVC || !activeVCs.has(memberVC.id)) {
            return interaction.reply({ content: "❌ You must be in a personal VC to use this.", flags: [MessageFlags.Ephemeral] });
          }
  
          if (activeVCs.get(memberVC.id) !== member.id) {
            return interaction.reply({ content: "❌ You are no longer the owner of this VC.", flags: [MessageFlags.Ephemeral] });
          }
  
          try {
            const limitStr = interaction.fields.getTextInputValue('user_limit');
            const limit = parseInt(limitStr);
            if (isNaN(limit) || limit < 0 || limit > 99) {
                return interaction.reply({ content: "❌ Please enter a valid number between 0 and 99.", flags: [MessageFlags.Ephemeral] });
            }
            await memberVC.setUserLimit(limit);
            return await interaction.reply({ content: `✅ VC user limit set to ${limit === 0 ? "Unlimited" : limit}.`, flags: [MessageFlags.Ephemeral] });
          } catch (err) {
            console.error('[TempVC] Limit error:', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "❌ Failed to set user limit.", flags: [MessageFlags.Ephemeral] }).catch(()=>null);
            }
          }
        }

        if (interaction.isModalSubmit() && interaction.customId === 'tempvc_kick_modal') {
          const member = interaction.member;
          const memberVC = member.voice.channel;
          
          if (!memberVC || !activeVCs.has(memberVC.id)) {
            return interaction.reply({ content: "❌ You must be in a personal VC to use this.", flags: [MessageFlags.Ephemeral] });
          }
  
          if (activeVCs.get(memberVC.id) !== member.id) {
            return interaction.reply({ content: "❌ You are no longer the owner of this VC.", flags: [MessageFlags.Ephemeral] });
          }
  
          try {
            const userInfo = interaction.fields.getTextInputValue('user_info').toLowerCase();
            const target = memberVC.members.find(m => 
              m.id === userInfo || 
              m.user.username.toLowerCase() === userInfo || 
              m.displayName.toLowerCase() === userInfo
            );
  
            if (!target) {
              return interaction.reply({ content: "❌ Member not found in your voice channel.", flags: [MessageFlags.Ephemeral] });
            }
  
            if (target.id === member.id) {
              return interaction.reply({ content: "❌ You cannot kick yourself.", flags: [MessageFlags.Ephemeral] });
            }
  
            await target.voice.disconnect();
            return await interaction.reply({ content: `✅ Kicked **${target.user.username}** from the VC.`, flags: [MessageFlags.Ephemeral] });
          } catch (err) {
            console.error('[TempVC] Kick error:', err);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: "❌ Failed to kick member.", flags: [MessageFlags.Ephemeral] }).catch(()=>null);
            }
          }
        }

        if (interaction.isModalSubmit() && interaction.customId === 'tempvc_transfer_modal') {
          const member = interaction.member;
          const memberVC = member.voice.channel;
          
          if (!memberVC || !activeVCs.has(memberVC.id)) {
            return interaction.reply({ content: "❌ You must be in a personal VC to use this.", flags: [MessageFlags.Ephemeral] });
          }
  
          if (activeVCs.get(memberVC.id) !== member.id) {
            return interaction.reply({ content: "❌ You are no longer the owner of this VC.", flags: [MessageFlags.Ephemeral] });
          }
  
          try {
            const userInfo = interaction.fields.getTextInputValue('user_info').toLowerCase();
            const target = memberVC.members.find(m => 
              (m.id === userInfo || 
              m.user.username.toLowerCase() === userInfo || 
              m.displayName.toLowerCase() === userInfo) &&
              m.id !== member.id
            );
  
            if (!target) {
              return interaction.reply({ content: "❌ Member not found in your voice channel.", flags: [MessageFlags.Ephemeral] });
            }
  
            // Transfer ownership
            activeVCs.set(memberVC.id, target.id);
            await memberVC.permissionOverwrites.edit(target.id, { ManageChannels: true, MoveMembers: true, Connect: true, Speak: true });
            await memberVC.permissionOverwrites.edit(member.id, { ManageChannels: null, MoveMembers: null });
            
            return await interaction.reply({ content: `👑 Ownership transferred to **${target.user.username}**.`, flags: [MessageFlags.Ephemeral] });
          } catch (err) {
            console.error('[TempVC] Transfer error:', err);
            return await interaction.reply({ content: "❌ Failed to transfer ownership.", flags: [MessageFlags.Ephemeral] }).catch(()=>null);
          }
        }

      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('tempvc_')) return;

      const action = interaction.customId.replace('tempvc_', '');
      const member = interaction.member;
      const memberVC = member.voice.channel;

      if (!memberVC || !activeVCs.has(memberVC.id)) {
        return interaction.reply({ content: "❌ You must be in a personal VC to use this.", flags: [MessageFlags.Ephemeral] });
      }

      if (activeVCs.get(memberVC.id) !== member.id) {
        return interaction.reply({ content: "❌ You are not the owner of this VC.", flags: [MessageFlags.Ephemeral] });
      }

      const everyoneRole = interaction.guild.roles.everyone.id;

      try {
        switch (action) {
          case 'lock':
            await memberVC.permissionOverwrites.edit(everyoneRole, { Connect: false });
            await interaction.reply({ content: "🔒 VC Locked.", flags: [MessageFlags.Ephemeral] });
            break;

          case 'unlock':
            await memberVC.permissionOverwrites.edit(everyoneRole, { Connect: null });
            await interaction.reply({ content: "🔓 VC Unlocked.", flags: [MessageFlags.Ephemeral] });
            break;

          case 'hide':
            await memberVC.permissionOverwrites.edit(everyoneRole, { ViewChannel: false });
            await interaction.reply({ content: "👁️ VC Hidden.", flags: [MessageFlags.Ephemeral] });
            break;

          case 'show':
            await memberVC.permissionOverwrites.edit(everyoneRole, { ViewChannel: null });
            await interaction.reply({ content: "👻 VC Visible.", flags: [MessageFlags.Ephemeral] });
            break;

          case 'rename':
            const modal = new ModalBuilder()
              .setCustomId('tempvc_rename_modal')
              .setTitle('Rename Voice Channel');

            const nameInput = new TextInputBuilder()
              .setCustomId('new_name')
              .setLabel("Enter new channel name")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder(memberVC.name.substring(0, 32)) 
              .setRequired(true)
              .setMaxLength(32);

            const row = new ActionRowBuilder().addComponents(nameInput);
            modal.addComponents(row);

            return await interaction.showModal(modal);

          case 'limit':
            const limitModal = new ModalBuilder()
              .setCustomId('tempvc_limit_modal')
              .setTitle('Set VC User Limit');

            const limitInput = new TextInputBuilder()
              .setCustomId('user_limit')
              .setLabel("Enter user limit (0 for Unlimited)")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder(memberVC.userLimit?.toString() || "0")
              .setRequired(true)
              .setMaxLength(2);

            const limitRow = new ActionRowBuilder().addComponents(limitInput);
            limitModal.addComponents(limitRow);

            return await interaction.showModal(limitModal);

          case 'kick':
            const kickModal = new ModalBuilder()
              .setCustomId('tempvc_kick_modal')
              .setTitle('Kick Member from VC');

            const kickInput = new TextInputBuilder()
              .setCustomId('user_info')
              .setLabel("Enter Username or User ID")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("e.g. Victor or 1234567890")
              .setRequired(true);

            const kickRow = new ActionRowBuilder().addComponents(kickInput);
            kickModal.addComponents(kickRow);

            return await interaction.showModal(kickModal);

          case 'transfer':
            const transferModal = new ModalBuilder()
              .setCustomId('tempvc_transfer_modal')
              .setTitle('Transfer Ownership');

            const transferInput = new TextInputBuilder()
              .setCustomId('user_info')
              .setLabel("Enter Username or User ID of new owner")
              .setStyle(TextInputStyle.Short)
              .setPlaceholder("e.g. Victor or 1234567890")
              .setRequired(true);

            const transferRow = new ActionRowBuilder().addComponents(transferInput);
            transferModal.addComponents(transferRow);

            return await interaction.showModal(transferModal);
        }
      } catch (err) {
        console.error('[TempVC] Button error:', err);
        if (!interaction.replied) {
          await interaction.reply({ content: "❌ An error occurred while processing your request.", flags: [MessageFlags.Ephemeral] }).catch(()=>null);
        }
      }
    });
  }
};
