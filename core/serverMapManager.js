const { ChannelType } = require('discord.js');

class ServerMapManager {
  constructor(client) {
    this.client = client;
    this.map = null;
  }

  normalize(name) {
    if (!name) return '';
    
    // Simple small-caps mapping to ensure decorated names resolve
    const smallCapsMap = {
      'ᴀ': 'a', 'ʙ': 'b', 'ᴄ': 'c', 'ᴅ': 'd', 'ᴇ': 'e', 'ꜰ': 'f', 'ɢ': 'g', 'ʜ': 'h', 
      'ɪ': 'i', 'ᴊ': 'j', 'ᴋ': 'k', 'ʟ': 'l', 'ᴍ': 'm', 'ɴ': 'n', 'ᴏ': 'o', 'ᴘ': 'p', 
      'ǫ': 'q', 'ʀ': 'r', 's': 's', 'ᴛ': 't', 'ᴜ': 'u', 'ᴠ': 'v', 'ᴡ': 'w', 'x': 'x', 
      'ʏ': 'y', 'ᴢ': 'z'
    };

    let normalized = name.toLowerCase();
    for (const [char, mapped] of Object.entries(smallCapsMap)) {
      normalized = normalized.replaceAll(char.toLowerCase(), mapped);
    }

    return normalized
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  async init(guild) {
    if (!guild) return;

    await guild.channels.fetch();
    await guild.roles.fetch();

    const categories = {};
    const channelsArray = Array.from(guild.channels.cache.values()).sort((a, b) => a.position - b.position);

    for (const channel of channelsArray) {
      if (channel.type === ChannelType.GuildCategory) {
        categories[this.normalize(channel.name)] = {
          id: channel.id,
          channels: {}
        };
      }
    }

    for (const channel of channelsArray) {
      if (channel.parentId && channel.type !== ChannelType.GuildCategory) {
        const parentCategory = guild.channels.cache.get(channel.parentId);
        if (parentCategory) {
          const normCat = this.normalize(parentCategory.name);
          const normChan = this.normalize(channel.name);
          
          let typeStr = 'unknown';
          switch (channel.type) {
            case ChannelType.GuildText: typeStr = 'text'; break;
            case ChannelType.GuildVoice: typeStr = 'voice'; break;
            case ChannelType.GuildForum: typeStr = 'forum'; break;
            case ChannelType.GuildAnnouncement: typeStr = 'announcement'; break;
          }

          if (categories[normCat]) {
            categories[normCat].channels[normChan] = {
              id: channel.id,
              type: typeStr
            };
          }
        }
      }
    }

    const roles = {};
    const rolesArray = Array.from(guild.roles.cache.values());
    for (const role of rolesArray) {
      if (!role.managed) {
        roles[this.normalize(role.name)] = role.id;
      }
    }

    this.map = {
      server: {
        name: guild.name,
        id: guild.id
      },
      categories,
      roles
    };

    console.log('[ServerMapManager] Server map initialized');
  }

  async refresh() {
    if (this.map && this.map.server.id) {
      const guild = this.client.guilds.cache.get(this.map.server.id);
      if (guild) await this.init(guild);
    }
  }

  getChannel(categoryName, channelName) {
    if (!this.map) return null;
    const normCat = this.normalize(categoryName);
    const normChan = this.normalize(channelName);
    
    if (this.map.categories[normCat] && this.map.categories[normCat].channels[normChan]) {
      const channelId = this.map.categories[normCat].channels[normChan].id;
      return this.client.channels.cache.get(channelId);
    }
    return null;
  }

  getChannelByName(channelName) {
    if (!this.map) return null;
    const normChan = this.normalize(channelName);
    
    for (const catKey in this.map.categories) {
      if (this.map.categories[catKey].channels[normChan]) {
        return this.client.channels.cache.get(this.map.categories[catKey].channels[normChan].id);
      }
    }
    return null;
  }

  getCategory(categoryName) {
    if (!this.map) return null;
    const normCat = this.normalize(categoryName);
    return this.map.categories[normCat] || null;
  }

  getRole(roleName) {
    if (!this.map) return null;
    const normRole = this.normalize(roleName);
    return this.map.roles[normRole] || null;
  }
}

module.exports = ServerMapManager;
