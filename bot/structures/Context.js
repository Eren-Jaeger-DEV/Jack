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
    constructor(args = [], command = null) {
        this.args = args;
        this.commandOptions = command?.data?.options || [];
        Object.freeze(this);
    }

    _getOptionIndex(name) {
        return this.commandOptions.findIndex(opt => opt.name === name);
    }

    getString(name) {
        const index = this._getOptionIndex(name);
        return index !== -1 ? this.args[index] || null : null;
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
    
    // Stub for other resolver methods (User, Role, etc. implemented as needed)
    getUser() { return null; }
    getMember() { return null; }
    getChannel() { return null; }
    getRole() { return null; }
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
        this.options = this.isInteraction ? source.options : new PrefixOptionResolver(args, command);

        // Metadata
        this.guildId = this.guild?.id;
        this.channelId = this.channel?.id;
        this.userId = this.user?.id;

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
                return await this.channel.send(data);
            }
        } catch (err) {
            if (err?.code === 10062) return null; // Unknown interaction
            logger.error("Context", `Failed to send reply: ${err.message}`);
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