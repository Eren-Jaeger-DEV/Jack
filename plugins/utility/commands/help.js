/**
 * help.js — /help [category] | j help [category]
 *
 * Full help command. Displays every command grouped by plugin category with:
 * - Command name (slash + prefix)
 * - Aliases
 * - Usage example
 * - Description
 *
 * With no argument: shows category select menu as a paginated embed.
 * With a category argument: shows that category's full command list.
 */

const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');

// Maps internal plugin folder names to emoji+display labels
const CATEGORY_META = {
  admin:      { emoji: '⚙️',  label: 'Admin' },
  clan:       { emoji: '⚔️',  label: 'Clan' },
  emoji:      { emoji: '😀',  label: 'Emoji Vault' },
  events:     { emoji: '🏆',  label: 'Events' },
  fun:        { emoji: '🎉',  label: 'Fun' },
  leveling:   { emoji: '📈',  label: 'Leveling' },
  market:     { emoji: '🛒',  label: 'Market' },
  moderation: { emoji: '🔨',  label: 'Moderation' },
  packs:      { emoji: '📦',  label: 'Packs' },
  roles:      { emoji: '🎭',  label: 'Reaction Roles' },
  sticker:    { emoji: '🖼️',  label: 'Sticker Vault' },
  utility:    { emoji: '🔧',  label: 'Utility' },
};

function buildCategoryEmbed(category, commands, isPrefix) {
  const meta = CATEGORY_META[category] || { emoji: '📂', label: category };
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${meta.emoji} ${meta.label} Commands`)
    .setFooter({ text: 'Prefix: j | J | jack | Jack   •   Use /help or j help <category> to filter' });

  for (const cmd of commands) {
    const name = isPrefix ? `j ${cmd.name}` : `/${cmd.name}`;
    const aliasLine = cmd.aliases?.length ? `**Aliases:** \`${cmd.aliases.join('`, `')}\`` : '';
    const usageLine = cmd.usage ? `**Usage:** \`${cmd.usage}\`` : '';
    const detailLine = cmd.details ? `*${cmd.details}*` : '';

    const lines = [cmd.description, aliasLine, usageLine, detailLine].filter(Boolean);
    embed.addFields({ name, value: lines.join('\n') || 'No details.', inline: false });
  }

  return embed;
}

function buildOverviewEmbed(categories, isPrefix) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle('📖 Jack Bot — Command Guide')
    .setDescription(
      isPrefix
        ? '**Prefixes:** `j` · `J` · `jack` · `Jack`\nRun `j help <category>` to see commands for a specific plugin.\nExample: `j help moderation`'
        : '**Run `/help <category>` to see commands for a specific plugin.**\nExample: `/help moderation`'
    )
    .setFooter({ text: `${Object.values(categories).flat().length} total commands across ${Object.keys(categories).length} plugins` });

  for (const [cat, cmds] of Object.entries(categories)) {
    const meta = CATEGORY_META[cat] || { emoji: '📂', label: cat };
    embed.addFields({
      name: `${meta.emoji} ${meta.label}`,
      value: cmds.map(c => `\`${c.name}\``).join(' · '),
      inline: false
    });
  }

  return embed;
}

module.exports = {
  name: 'help',
  aliases: ['h', 'commands', 'cmds'],
  category: 'utility',
  description: 'Show all commands, grouped by plugin, with usage and aliases',
  usage: '/help [category]  |  j help [category]',
  details: 'Categories: admin, clan, emoji, events, fun, leveling, market, moderation, packs, roles, sticker, utility',

  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands')
    .addStringOption(o =>
      o.setName('category')
        .setDescription('Filter by plugin category')
        .setRequired(false)
        .addChoices(
          ...Object.entries(CATEGORY_META).map(([value, { emoji, label }]) => ({
            name: `${emoji} ${label}`,
            value
          }))
        )
    ),

  async run(ctx) {
    const isPrefix = ctx.type === 'prefix';

    // -- Resolve category argument from slash or prefix --
    let filterCategory = null;
    if (ctx.options?.getString) {
      filterCategory = ctx.options.getString('category');
    } else if (ctx.args[0]) {
      filterCategory = ctx.args[0].toLowerCase();
    }

    // -- Build command map grouped by category --
    const categories = {};
    ctx.client.commands.forEach(cmd => {
      const cat = cmd.category || 'uncategorized';
      if (!categories[cat]) categories[cat] = [];
      // Deduplicate in case pluginLoader's proxy registers multiple times
      if (!categories[cat].find(c => c.name === cmd.name)) {
        categories[cat].push(cmd);
      }
    });

    // -- Single category view --
    if (filterCategory) {
      const cmds = categories[filterCategory];
      if (!cmds || cmds.length === 0) {
        return ctx.reply({
          content: `❌ No category found: \`${filterCategory}\`\nValid categories: \`${Object.keys(CATEGORY_META).join('`, `')}\``,
          ephemeral: true
        });
      }
      const embed = buildCategoryEmbed(filterCategory, cmds, isPrefix);
      return ctx.reply({ embeds: [embed] });
    }

    // -- Overview: all categories --
    const embed = buildOverviewEmbed(categories, isPrefix);
    return ctx.reply({ embeds: [embed] });
  }
};