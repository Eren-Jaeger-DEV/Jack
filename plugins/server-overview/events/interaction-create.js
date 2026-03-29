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
            
            // Send the ephemeral details to the user
            const embed = buildOverviewEmbed(interaction.guild, section);
            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Reset the main panel dropdown by editing the original message
            const mainEmbed = buildOverviewEmbed(interaction.guild);
            const row = buildOverviewDropdown(config.sections);
            await interaction.message.edit({ embeds: [mainEmbed], components: row ? [row] : [] });
            return;
        }

        // 2. ADMIN ONLY CHECK
        const adminActions = [
            'add_section', 'delete_section', 'add_item', 'edit_item', 'delete_item',
            'modal_edit_item_select', 'modal_delete_item_select', 'modal_delete_section_select'
        ];

        if (customId.startsWith('overview_') || adminActions.includes(customId)) {
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

        // 5. EDIT ITEM (Selection Menu)
        if (customId === 'edit_item') {
            const config = await OverviewConfig.findOne({ guildId });
            if (config.sections.every(s => s.items.length === 0)) {
                return await interaction.reply({ content: "❌ No items to edit.", ephemeral: true });
            }

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('modal_edit_item_select')
                    .setPlaceholder('Select item to edit...')
                    .addOptions(config.sections.flatMap(s => s.items.map(i => ({
                        label: `${s.name}: ${i.title}`.substring(0, 100),
                        value: i._id.toString()
                    }))))
            );

            await interaction.reply({ content: "Select an item to edit:", components: [row], ephemeral: true });
        }

        if (customId === 'modal_edit_item_select') {
            const itemId = interaction.values[0];
            const config = await OverviewConfig.findOne({ guildId });
            
            let item = null;
            let sectionName = "";

            for (const s of config.sections) {
                item = s.items.id(itemId);
                if (item) {
                    sectionName = s.name;
                    break;
                }
            }

            if (!item) return await interaction.reply({ content: "❌ Item not found!", ephemeral: true });

            const modal = new ModalBuilder().setCustomId(`modal_edit_item_submit|${itemId}`).setTitle('Edit Item Details');
            const titleInput = new TextInputBuilder().setCustomId('item_title').setLabel("Title").setStyle(TextInputStyle.Short).setValue(item.title).setRequired(true);
            const descInput = new TextInputBuilder().setCustomId('item_desc').setLabel("Description").setStyle(TextInputStyle.Paragraph).setValue(item.description).setRequired(true);
            
            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput)
            );
            return await interaction.showModal(modal);
        }

        // 6. MODAL SUBMISSIONS: DATA UPDATE
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

            if (customId.startsWith('modal_edit_item_submit')) {
                const itemId = customId.split('|')[1];
                const newTitle = interaction.fields.getTextInputValue('item_title');
                const newDescription = interaction.fields.getTextInputValue('item_desc');

                let itemFound = false;
                for (const s of config.sections) {
                    const item = s.items.id(itemId);
                    if (item) {
                        item.title = newTitle;
                        item.description = newDescription;
                        itemFound = true;
                        break;
                    }
                }

                if (itemFound) {
                    config.markModified('sections');
                    await config.save();
                }
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
                        label: `${s.name}: ${i.title}`.substring(0, 100),
                        value: i._id.toString()
                    }))))
            );

            await interaction.reply({ content: "Select an item to remove:", components: [row], ephemeral: true });
        }

        if (customId === 'modal_delete_item_select') {
            await interaction.deferUpdate();
            const itemId = interaction.values[0];
            const config = await OverviewConfig.findOne({ guildId });
            
            let itemFound = false;
            for (const s of config.sections) {
                const item = s.items.id(itemId);
                if (item) {
                    s.items.pull(itemId);
                    itemFound = true;
                    break;
                }
            }

            if (itemFound) {
                config.markModified('sections');
                await config.save();
            }

            await syncAll(interaction, config);
            await interaction.editReply({ content: "✅ Item deleted.", components: [] });
        }

        // 6. DELETE SECTION
        if (customId === 'delete_section') {
            const config = await OverviewConfig.findOne({ guildId });
            if (config.sections.length === 0) {
                return await interaction.reply({ content: "❌ No sections to delete.", ephemeral: true });
            }

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('modal_delete_section_select')
                    .setPlaceholder('Select section to delete...')
                    .addOptions(config.sections.map(s => ({
                        label: s.name,
                        value: s.name
                    })))
            );

            await interaction.reply({ content: "Select a section to remove:", components: [row], ephemeral: true });
        }

        if (customId === 'modal_delete_section_select') {
            await interaction.deferUpdate();
            const sectionName = interaction.values[0];
            const config = await OverviewConfig.findOne({ guildId });
            
            config.sections = config.sections.filter(s => s.name !== sectionName);
            config.markModified('sections');
            await config.save();

            await syncAll(interaction, config);
            await interaction.editReply({ content: "✅ Section deleted.", components: [] });
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
