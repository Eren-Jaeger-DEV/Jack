const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require("@discordjs/voice");
const audioHandler = require("../utils/audioHandler");
const path = require("path");
const fs = require("fs");

module.exports = {
  name: "record",
  category: "recorder",
  description: "Manage voice recordings",
  details: "Start or stop multi-track voice recordings in your current voice channel.",
  usage: "/record start | /record stop",
  
  data: new SlashCommandBuilder()
    .setName("record")
    .setDescription("Manage voice recordings")
    .addSubcommand(subcommand =>
      subcommand
        .setName("start")
        .setDescription("Start recording the current voice channel")
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("stop")
        .setDescription("Stop the current recording and get the files")
    ),

  async run(ctx) {
    const subcommand = ctx.interaction.options.getSubcommand();
    const guildId = ctx.interaction.guildId;
    const member = ctx.interaction.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return ctx.reply("❌ You must be in a voice channel to use this command.");
    }

    if (subcommand === "start") {
      if (ctx.client.recorder?.activeRecordings.has(guildId)) {
        return ctx.reply("⚠️ A recording is already in progress in this server.");
      }

      await ctx.interaction.deferReply();

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      // Debugging listeners to identify VM networking issues
      connection.on('stateChange', (oldState, newState) => {
        console.log(`[Recorder Debug] Connection state change: ${oldState.status} -> ${newState.status}`);
      });

      connection.on('debug', (message) => {
        console.log(`[Recorder Debug] DEBUG: ${message}`);
      });

      connection.on('error', (error) => {
        console.error(`[Recorder Error] Voice connection error:`, error);
      });

      try {
        // Log libsodium status precisely
        const sodium = require("libsodium-wrappers");
        console.log("[Recorder Debug] Waiting for libsodium...");
        await sodium.ready;
        console.log("[Recorder Debug] libsodium is READY. Random test: " + sodium.randombytes_buf(1).toString("hex"));

        // Increase timeout to 45s for VM network stabilization
        await entersState(connection, VoiceConnectionStatus.Ready, 45e3);

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.getHours().toString().padStart(2, '0') + '-' + now.getMinutes().toString().padStart(2, '0');
        const folderName = `${dateStr}_${timeStr}_${guildId}`;
        const recordingDir = path.join(__dirname, "../../../data/recordings", folderName);
        
        if (!fs.existsSync(recordingDir)) {
          fs.mkdirSync(recordingDir, { recursive: true });
        }

        const receiver = connection.receiver;
        const participants = [];

        // Subscribe to everyone currently in the channel
        voiceChannel.members.forEach(m => {
          if (m.user.bot) return;
          audioHandler.recordUser(receiver, m.id, guildId, recordingDir);
          participants.push({
            id: m.id,
            username: m.user.username,
            avatar: m.user.displayAvatarURL()
          });
        });

        // Save initial metadata
        const metadata = {
          guildId,
          channelId: voiceChannel.id,
          channelName: voiceChannel.name,
          startTime: now.toISOString(),
          participants: participants
        };
        fs.writeFileSync(path.join(recordingDir, "metadata.json"), JSON.stringify(metadata, null, 2));

        // Event listener for new people joining
        receiver.speaking.on("start", (userId) => {
          if (!audioHandler.streams.get(guildId)?.has(userId)) {
             const user = voiceChannel.members.get(userId);
             if (user && !user.user.bot) {
                audioHandler.recordUser(receiver, userId, guildId, recordingDir);
                
                // Update metadata with new participant if not already there
                const currentMeta = JSON.parse(fs.readFileSync(path.join(recordingDir, "metadata.json")));
                if (!currentMeta.participants.find(p => p.id === userId)) {
                  currentMeta.participants.push({
                    id: userId,
                    username: user.user.username,
                    avatar: user.user.displayAvatarURL()
                  });
                  fs.writeFileSync(path.join(recordingDir, "metadata.json"), JSON.stringify(currentMeta, null, 2));
                }
             }
          }
        });

        ctx.client.recorder.activeRecordings.set(guildId, {
          connection,
          voiceChannel,
          recordingDir,
          startTime: Date.now()
        });

        await ctx.interaction.editReply(`🔴 **Recording Started** in <#${voiceChannel.id}>. \n\n> **NOTICE**: By staying in this channel, you consent to being recorded. Recordings are multi-track and will be mixed into a single master track.`);

        // Set a timeout for the 2-hour limit
        setTimeout(async () => {
          if (ctx.client.recorder.activeRecordings.has(guildId)) {
             console.log(`Recording in ${guildId} reached 2-hour limit.`);
          }
        }, 2 * 60 * 60 * 1000);

      } catch (error) {
        console.error("[Recorder Debug] Failed to reach Ready state.", error);
        // CRITICAL: Ensure connection is destroyed if we fail to reach Ready
        if (connection && connection.state.status !== VoiceConnectionStatus.Destroyed) {
          connection.destroy();
        }
        await ctx.interaction.editReply("❌ Failed to join voice channel or start recording (Handshake Timeout).");
      }
    }

    if (subcommand === "stop") {
      const recording = ctx.client.recorder?.activeRecordings.get(guildId);
      if (!recording) {
        return ctx.reply("⚠️ No recording is currently in progress.");
      }

      await ctx.interaction.deferReply();

      try {
        const { connection, recordingDir } = recording;
        
        const result = await audioHandler.stopRecording(guildId, recordingDir);
        connection.destroy();
        ctx.client.recorder.activeRecordings.delete(guildId);

        if (!result || !result.individual.length) {
          return ctx.interaction.editReply("⚠️ Recording stopped, but no audio was captured.");
        }

        let response = `✅ **Recording Stopped.**\nCapture completed for ${result.individual.length} participant(s).\n\n`;
        
        if (result.mixed) {
           response += `🎵 **Mixed Master Track**: \`${path.basename(result.mixed)}\`\n`;
        }
        
        response += `📁 **Individual Tracks**: \n` + result.individual.map(f => `• \`${path.basename(f)}\``).join("\n");
        response += `\n\n*Files are stored on the server for 24 hours. Contact admin for download instructions.*`;

        // In a real bot, we might upload to a storage service (S3/GCS) and provide links.
        // For now, we provide the file names. If the mixed file is small enough, we could attach it.
        
        const attachments = [];
        if (result.mixed && fs.statSync(result.mixed).size < 25 * 1024 * 1024) {
           attachments.push(result.mixed);
        }

        await ctx.interaction.editReply({
          content: response,
          files: attachments
        });

      } catch (error) {
        console.error("Recording stop error:", error);
        await ctx.interaction.editReply("❌ Failed to process recording results.");
      }
    }
  }
};
