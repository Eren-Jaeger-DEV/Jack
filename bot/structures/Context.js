const { MessageFlags, PermissionFlagsBits } = require("discord.js");

/**
 * Normalized Option Resolver for Prefix Commands.
 * Mirrors the Discord.js CommandInteractionOptionResolver API.
 */
class PrefixOptionResolver {
  constructor(ctx, command, args) {
    this.ctx = ctx;
    this.command = command;
    this.args = args;
    this.options = command?.data?.options || [];
  }

  _getOptionIndex(name) {
    return this.options.findIndex(opt => opt.name === name);
  }

  getString(name) {
    const index = this._getOptionIndex(name);
    if (index === -1) return null;
    
    // If it's the last option and a string, we might want to join remaining args
    // but for simplicity, we'll just take the arg at that index.
    return this.args[index] || null;
  }

  getUser(name) {
    const index = this._getOptionIndex(name);
    if (index === -1) return null;

    // Check if the argument at this index is a mention
    const arg = this.args[index];
    if (arg && arg.startsWith('<@') && arg.endsWith('>')) {
      return this.ctx.message.mentions.users.get(arg.replace(/[<@!>]/g, '')) || null;
    }
    
    // Fallback to first mention if the arg looks like a mention but not found specifically
    return this.ctx.message.mentions.users.first() || null;
  }

  getMember(name) {
    const index = this._getOptionIndex(name);
    if (index === -1) return null;

    const arg = this.args[index];
    if (arg && arg.startsWith('<@') && arg.endsWith('>')) {
      return this.ctx.message.mentions.members.get(arg.replace(/[<@!>]/g, '')) || null;
    }
    return this.ctx.message.mentions.members.first() || null;
  }

  getInteger(name) {
    const val = this.getString(name);
    return val ? parseInt(val) : null;
  }

  getBoolean(name) {
    const val = this.getString(name)?.toLowerCase();
    if (val === 'true' || val === 'yes' || val === 'on') return true;
    if (val === 'false' || val === 'no' || val === 'off') return false;
    return null;
  }

  getChannel(name) {
    return this.ctx.message.mentions.channels.first() || null;
  }

  getRole(name) {
    return this.ctx.message.mentions.roles.first() || null;
  }
}

class Context {
  constructor(client, source, args = [], command = null) {
    this.client = client;
    this.source = source;
    this.args = args;
    this.command = command;
    this.isInteraction = typeof source.isChatInputCommand === "function";
    this.type = this.isInteraction ? "slash" : "prefix";

    this.interaction = this.isInteraction ? source : null;
    this.message = this.isInteraction ? null : source;

    this.user = source.user || source.author;
    this.member = source.member;
    this.guild = source.guild;
    this.channel = source.channel;

    if (this.isInteraction) {
      this.options = source.options;
    } else {
      this.options = new PrefixOptionResolver(this, command, args);
    }
  }

  get author() { return this.user; }
  get guildId() { return this.guild?.id; }
  get channelId() { return this.channel?.id; }
  get userId() { return this.user?.id; }

  async reply(data) {
    if (typeof data === "string") data = { content: data };

    try {
      if (this.isInteraction) {
        if (this.source.deferred || this.source.replied) {
          return await this.source.followUp(data);
        }
        
        const fetchReply = data.fetchReply === true;
        if (fetchReply) delete data.fetchReply;

        const response = await this.source.reply(data);
        return fetchReply ? await this.source.fetchReply() : response;
      }

      return await this.channel.send(data);
    } catch (err) {
      if (err?.code === 10062 || err?.message === "Unknown interaction") return null;
      console.error("[Context] Reply error:", err);
      throw err;
    }
  }

  async defer(options = {}) {
    if (this.isInteraction) {
      return await this.source.deferReply(options);
    }
    return await this.channel.sendTyping().catch(() => null);
  }

  async editReply(data) {
    if (typeof data === "string") data = { content: data };
    if (this.isInteraction) {
      return await this.source.editReply(data);
    }
    // Limited support for prefix edit, but could be added if needed
  }
}

module.exports = Context;