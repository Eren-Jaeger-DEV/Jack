const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, PermissionFlagsBits } = require('discord.js');
const OverviewConfig = require('../models/OverviewConfig');
const { buildOverviewEmbed, buildOverviewDropdown } = require('../services/overviewService');
const { buildControlPanelEmbed } = require('../services/controlPanelService');
const logger = require('../../../bot/utils/logger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

        const { customId, guildId, user } = interaction;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        // 1. PUBLIC OVERVIEW: Dropdown Selection
        if (customId === 'overview_select') {
            const config = await OverviewConfig.findOne({ guildId });
            if (!config) return;

            const sectionName = interaction.values[0];
            const section = config.sections.find(s => s.name === sectionName);
            
            const embed = buildOverviewEmbed(interaction.guild, section);
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // 2. ADMIN ONLY CHECK
        if (customId.startsWith('overview_') || ['add_section', 'add_item', 'edit_item', 'delete_item'].includes(customId)) {
            if (!isAdmin) {
                return await interaction.reply({ content: "❌ You do not have permission to use the control panel.", ephemeral: true });
            }
        }

        // 3. BUTTONS: SHOW MODALS
        if (customId === 'add_section') {
            const modal = new ModalBuilder().setCustomId('modal_add_section').setTitle('Add New Section');
            const nameInput = new TextInputBuilder().setCustomId('section_name').setLabel("Section Name").setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
            return await interaction.showModal(modal);
        }

        if (customId === 'add_item') {
            const config = await OverviewConfig.findOne({ guildId });
            if (config.sections.length === 0) return await interaction.reply({ content: "❌ Create a section first!", ephemeral: true });

            const modal = new ModalBuilder().setCustomId('modal_add_item').setTitle('Add Item to Section');
            const sectionInput = new TextInputBuilder().setCustomId('section_name').setLabel("Target Section Name").setStyle(TextInputStyle.Short).setRequired(true);
            const titleInput = new TextInputBuilder().setCustomId('item_title').setLabel("Title").setStyle(TextInputStyle.Short).setRequired(true);
            const descInput = new TextInputBuilder().setCustomId('item_desc').setLabel("Description").setStyle(TextInputStyle.Paragraph).setRequired(true);
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(sectionInput),
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput)
            );
            return await interaction.showModal(modal);
        }

        // 4. MODAL SUBMISSIONS: DATA UPDATE
        if (interaction.isModalSubmit()) {
            await interaction.deferUpdate();
            const config = await OverviewConfig.findOne({ guildId });

            if (customId === 'modal_add_section') {
                const name = interaction.fields.getTextInputValue('section_name');
                if (config.sections.some(s => s.name === name)) {
                    return await interaction.followUp({ content: "❌ Section already exists!", ephemeral: true });
                }
                config.sections.push({ name, items: [] });
                await config.save();
            }

            if (customId === 'modal_add_item') {
                const sectionName = interaction.fields.getTextInputValue('section_name');
                const title = interaction.fields.getTextInputValue('item_title');
                const description = interaction.fields.getTextInputValue('item_desc');

                const section = config.sections.find(s => s.name === sectionName);
                if (!section) return await interaction.followUp({ content: "❌ Section not found!", ephemeral: true });

                section.items.push({ title, description });
                await config.save();
            }

            // Sync Both UIs
            await syncAll(interaction, config);
        }

        // 5. DELETE ITEM (Simple Selection Flow)
        if (customId === 'delete_item') {
            const config = await OverviewConfig.findOne({ guildId });
            if (config.sections.every(s => s.items.length === 0)) {
                return await interaction.reply({ content: "❌ No items to delete.", ephemeral: true });
            }

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('modal_delete_item_select')
                    .setPlaceholder('Select item to delete...')
                    .addOptions(config.sections.flatMap(s => s.items.map(i => ({
                        label: `${s.name}: ${i.title}`,
                        value: `${s.name}|${i.title}`
                    }))))
            );

            await interaction.reply({ content: "Select an item to remove:", components: [row], ephemeral: true });
        }

        if (customId === 'modal_delete_item_select') {
            await interaction.deferUpdate();
            const [sName, iTitle] = interaction.values[0].split('|');
            const config = await OverviewConfig.findOne({ guildId });
            
            const section = config.sections.find(s => s.name === sName);
            section.items = section.items.filter(i => i.title !== iTitle);
            await config.save();

            await syncAll(interaction, config);
            await interaction.editReply({ content: "✅ Item deleted.", components: [] });
        }
    }
};

/**
 * Rebuilds and edits both Overview and Control Panel messages.
 */
async function syncAll(interaction, config) {
    const { client } = interaction;
    
    try {
        // Sync Overview
        if (config.overviewMessageId) {
            const OVERVIEW_CHANNEL_ID = "1477894589565374667";
            const channel = client.channels.cache.get(OVERVIEW_CHANNEL_ID);
            if (channel) {
                const message = await channel.messages.fetch(config.overviewMessageId).catch(() => null);
                if (message) {
                    const embed = buildOverviewEmbed(message.guild);
                    const row = buildOverviewDropdown(config.sections);
                    await message.edit({ embeds: [embed], components: row ? [row] : [] });
                }
            }
        }

        // Sync Control Panel
        const embed = buildControlPanelEmbed(config);
        await interaction.editReply({ embeds: [embed] });

    } catch (err) {
        logger.error("ServerOverview", "Sync Failed", { error: err.message });
    }
}
