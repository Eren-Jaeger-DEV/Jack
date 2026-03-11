const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const Panel = require("./panelManager");

function buildButtons() {

  return new ActionRowBuilder().addComponents(

    new ButtonBuilder()
      .setCustomId("overview_roles")
      .setLabel("Roles")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("overview_channels")
      .setLabel("Channels")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("overview_clan")
      .setLabel("Clan Activity")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("overview_pop")
      .setLabel("POP Ecosystem")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("overview_support")
      .setLabel("Rewards & Support")
      .setStyle(ButtonStyle.Danger)
  );

}

function rolesEmbed(guild) {

  const roles = guild.roles.cache
    .filter(r => r.name !== "@everyone")
    .map(r => `• ${r.name}`)
    .slice(0, 20)
    .join("\n");

  return new EmbedBuilder()
    .setTitle("Server Roles")
    .setDescription(roles || "No roles found");

}

function channelsEmbed(guild) {

  const channels = guild.channels.cache
    .map(c => `• #${c.name}`)
    .slice(0, 20)
    .join("\n");

  return new EmbedBuilder()
    .setTitle("Server Channels")
    .setDescription(channels || "No channels found");

}

function clanEmbed() {

  return new EmbedBuilder()
    .setTitle("Clan Activities")
    .setDescription(
`• Clan wars  
• Weekly events  
• Tournament participation  

Stay active to earn rewards and recognition.`
    );

}

function popEmbed() {

  return new EmbedBuilder()
    .setTitle("POP Ecosystem")
    .setDescription(
`POP is the server economy system.

• Earn POP from activities
• Spend POP in the marketplace
• Participate in events for bonuses`
    );

}

function supportEmbed() {

  return new EmbedBuilder()
    .setTitle("Rewards & Support")
    .setDescription(
`Need help or want to claim rewards?

• Use the support ticket system
• Contact moderators
• Claim event rewards in the reward channel`
    );

}

async function createOverview(channel) {

  const embed = new EmbedBuilder()
    .setTitle("Server Overview")
    .setDescription("Use the buttons below to explore server information.");

  return Panel.createPanel(channel, {
    embeds: [embed],
    components: [buildButtons()]
  });

}

module.exports = {
  createOverview,
  rolesEmbed,
  channelsEmbed,
  clanEmbed,
  popEmbed,
  supportEmbed,
  buildButtons
};