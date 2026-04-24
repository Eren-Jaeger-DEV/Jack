const { logger } = require('../../bot/utils/logger');

module.exports = {
    schema: {
        name: 'moderate_voice',
        description: 'MODERATION: Execute voice channel moderation actions (mute, deafen, disconnect, move, lock, unlock).',
        parameters: {
            type: 'OBJECT',
            properties: {
                action: {
                    type: 'STRING',
                    enum: ['server_mute', 'server_deafen', 'unmute', 'undeafen', 'disconnect', 'move', 'lock_channel', 'unlock_channel'],
                    description: 'The moderation action to perform.'
                },
                target_user_id: {
                    type: 'STRING',
                    description: 'The Discord ID of the user to act on (required for user actions).'
                },
                channel_id: {
                    type: 'STRING',
                    description: 'The Voice Channel ID (required for lock/unlock or move destination).'
                }
            },
            required: ['action']
        }
    },
    async execute(args, invoker, guild) {
        const { action, target_user_id, channel_id } = args;

        try {
            let targetMember = null;
            if (target_user_id) {
                targetMember = await guild.members.fetch(target_user_id).catch(() => null);
                if (!targetMember) return { success: false, message: 'Target user not found in the guild.' };
            }

            let targetChannel = null;
            if (channel_id) {
                targetChannel = await guild.channels.fetch(channel_id).catch(() => null);
                if (!targetChannel) return { success: false, message: 'Target channel not found.' };
            }

            switch (action) {
                case 'server_mute':
                    if (!targetMember?.voice?.channel) return { success: false, message: 'User is not in a voice channel.' };
                    await targetMember.voice.setMute(true, 'Voice moderation: server_mute');
                    return { success: true, message: `Successfully server-muted user ${target_user_id}.` };

                case 'server_deafen':
                    if (!targetMember?.voice?.channel) return { success: false, message: 'User is not in a voice channel.' };
                    await targetMember.voice.setDeaf(true, 'Voice moderation: server_deafen');
                    return { success: true, message: `Successfully server-deafened user ${target_user_id}.` };

                case 'unmute':
                    if (!targetMember?.voice?.channel) return { success: false, message: 'User is not in a voice channel.' };
                    await targetMember.voice.setMute(false, 'Voice moderation: unmute');
                    return { success: true, message: `Successfully unmuted user ${target_user_id}.` };

                case 'undeafen':
                    if (!targetMember?.voice?.channel) return { success: false, message: 'User is not in a voice channel.' };
                    await targetMember.voice.setDeaf(false, 'Voice moderation: undeafen');
                    return { success: true, message: `Successfully undeafened user ${target_user_id}.` };

                case 'disconnect':
                    if (!targetMember?.voice?.channel) return { success: false, message: 'User is not in a voice channel.' };
                    await targetMember.voice.disconnect('Voice moderation: disconnect');
                    return { success: true, message: `Successfully disconnected user ${target_user_id} from voice.` };

                case 'move':
                    if (!targetMember?.voice?.channel) return { success: false, message: 'User is not in a voice channel.' };
                    if (!targetChannel) return { success: false, message: 'Destination channel ID is required for move.' };
                    await targetMember.voice.setChannel(targetChannel, 'Voice moderation: move');
                    return { success: true, message: `Successfully moved user ${target_user_id} to channel ${channel_id}.` };

                case 'lock_channel':
                    if (!targetChannel) return { success: false, message: 'Channel ID is required to lock.' };
                    await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
                    return { success: true, message: `Successfully locked voice channel ${channel_id}.` };

                case 'unlock_channel':
                    if (!targetChannel) return { success: false, message: 'Channel ID is required to unlock.' };
                    await targetChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
                    return { success: true, message: `Successfully unlocked voice channel ${channel_id}.` };

                default:
                    return { success: false, message: 'Invalid action specified.' };
            }
        } catch (error) {
            if (typeof logger !== 'undefined') {
                logger.error('moderate_voice', error.message);
            }
            return { success: false, message: `Error executing voice moderation: ${error.message}` };
        }
    }
};
