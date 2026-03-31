/**
 * JACK HARDENED CONTEXT (v2.1.0)
 * Unified, immutable interface for Discord interactions and messages.
 * Prevents direct raw access patterns and ensures consistent response logic.
 */

const { MessageFlags } = require("discord.js");
const logger = require("../utils/logger");

/**
 * Normalized Option Resolver for Prefix Commands.
 */
class PrefixOptionResolver {
    constructor(ctx, args = [], command = null) {
        this.ctx = ctx; // Link to full context
        this.args = args;
        this.commandOptions = command?.data?.options || [];
        Object.freeze(this);
    }

    _getOptionIndex(name) {
        return this.commandOptions.findIndex(opt => opt.name === name);
    }

    getString(name) {
        const index = this._getOptionIndex(name);
        if (index === -1) return null;

        // If this is the last available option in the command, consume all remaining arguments
        if (index === this.commandOptions.length - 1) {
            return this.args.slice(index).join(" ") || null;
        }

        return this.args[index] || null;
    }

    getInteger(name) {
        const val = this.getString(name);
        return val ? parseInt(val) : null;
    }

    getBoolean(name) {
        const val = this.getString(name)?.toLowerCase();
        if (['true', 'yes', 'on', '1'].includes(val)) return true;
        if (['false', 'no', 'off', '0'].includes(val)) return false;
        return null;
    }
    
    /**
     * Resolves a user from mentions or IDs.
     */
    getUser(name) {
        const val = this.getString(name);
        if (!val) return null;

        const mentionMatch = val.match(/<@!?(\d+)>/);
        const id = mentionMatch ? mentionMatch[1] : (val.match(/^\d{17,19}$/) ? val : null);
        
        if (!id) return null;
        
        // 1. Check strict cache
        let cachedUser = this.ctx.client.users.cache.get(id);
        if (cachedUser) return cachedUser;

        // 2. Check message mentions (Message context caches mentioned users natively)
        if (this.ctx.message && this.ctx.message.mentions) {
            cachedUser = this.ctx.message.mentions.users.get(id);
            if (cachedUser) return cachedUser;
        }

        // 3. Provide resilient fallback mock.
        // This ensures the command executes safely and subsequently uses .fetch(user.id)
        return {
            id,
            bot: false,
            system: false,
            username: "Unknown",
            discriminator: "0000",
            tag: "Unknown User",
            toString: () => `<@${id}>`,
            displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png"
        };
    }

    /**
     * Resolves a member from the guild.
     */
    getMember(name) {
        const user = this.getUser(name);
        if (!user) return null;
        return this.ctx.guild.members.cache.get(user.id) || null;
    }

    getRole(name) {
        const val = this.getString(name);
        if (!val) return null;
        const mentionMatch = val.match(/<@&(\d+)>/);
        const id = mentionMatch ? mentionMatch[1] : (val.match(/^\d{17,19}$/) ? val : null);
        if (!id) return null;
        return this.ctx.guild.roles.cache.get(id) || null;
    }

    getChannel(name) {
        const val = this.getString(name);
        if (!val) return null;
        const mentionMatch = val.match(/<#(\d+)>/);
        const id = mentionMatch ? mentionMatch[1] : (val.match(/^\d{17,19}$/) ? val : null);
        if (!id) return null;
        return this.ctx.guild.channels.cache.get(id) || null;
    }
}

class Context {
    constructor(client, source, args = [], command = null) {
        this.client = client;
        this.source = source; // Original Message or Interaction
        this.command = command;
        
        this.isInteraction = typeof source.isChatInputCommand === "function";
        
        // Legacy/Compatibility Layer
        this.type = this.isInteraction ? "slash" : "prefix";
        this.args = args;
        this.interaction = this.isInteraction ? source : null;
        this.message = !this.isInteraction ? source : null;

        // Identity
        this.user = source.user || source.author;
        this.member = source.member;
        this.guild = source.guild;
        this.channel = source.channel;
        
        // Options
        this.options = this.isInteraction ? source.options : new PrefixOptionResolver(this, args, command);

        // Metadata
        this.guildId = this.guild?.id;
        this.channelId = this.channel?.id;
        this.userId = this.user?.id;

        // Internal tracking for edits
        this._lastResponse = null;

        // Prevent modification
        Object.freeze(this);
    }

    /**
     * Standardized reply function.
     * Enforces the use of the context system for all responses.
     */
    async reply(data) {
        if (typeof data === "string") data = { content: data };
        
        // Handle deprecated ephemeral property
        if (data.ephemeral === true) {
            data.flags = [MessageFlags.Ephemeral];
            delete data.ephemeral;
        }

        try {
            if (this.isInteraction) {
                if (this.source.deferred || this.source.replied) {
                    return await this.source.followUp(data);
                }
                return await this.source.reply(data);
            } else {
                const msg = await this.channel.send(data);
                this._lastResponse = msg;
                return msg;
            }
        } catch (err) {
            if (err?.code === 10062) return null; // Unknown interaction
            logger.error("Context", `Failed to send reply: ${err.message}`);
            throw err;
        }
    }

    /**
     * Standardized edit function.
     * Edits the existing reply or original response.
     */
    async editReply(data) {
        if (typeof data === "string") data = { content: data };
        
        // Handle deprecated ephemeral property
        if (data.ephemeral === true) {
            data.flags = [MessageFlags.Ephemeral];
            delete data.ephemeral;
        }

        try {
            if (this.isInteraction) {
                return await this.source.editReply(data);
            } else {
                if (this._lastResponse) {
                    return await this._lastResponse.edit(data);
                }
                return await this.reply(data);
            }
        } catch (err) {
            if (err?.code === 10062) return null; // Unknown interaction
            logger.error("Context", `Failed to edit reply: ${err.message}`);
            throw err;
        }
    }

    /**
     * Standardized defer function.
     */
    async defer(options = {}) {
        if (this.isInteraction) {
            // Handle deprecated ephemeral property
            if (options.ephemeral === true) {
                options.flags = [MessageFlags.Ephemeral];
                delete options.ephemeral;
            }
            return await this.source.deferReply(options);
        } else {
            return await this.channel.sendTyping().catch(() => null);
        }
    }

}

module.exports = Context;