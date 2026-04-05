const { EndBehaviorType } = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");
const prism = require("prism-media");
const { exec } = require("child_process");
const { promisify } = require("util");

const execPromise = promisify(exec);

class AudioHandler {
  constructor() {
    this.streams = new Map(); // guildId -> Map(userId -> stream)
    this.files = new Map(); // guildId -> Map(userId -> filePath)
  }

  recordUser(receiver, userId, guildId, recordingDir) {
    const opusStream = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1000,
      },
    });

    const fileName = `${userId}-${Date.now()}.ogg`;
    const filePath = path.join(recordingDir, fileName);

    // Create an Ogg Opust encoder
    const oggStream = new prism.opus.OggLogicalBitstream({
      opusHead: new prism.opus.OpusHead({
        channelCount: 2,
        sampleRate: 48000,
      }),
      pageSizeCycles: 120,
    });

    const out = fs.createWriteStream(filePath);

    opusStream.pipe(oggStream).pipe(out);

    if (!this.streams.has(guildId)) this.streams.set(guildId, new Map());
    if (!this.files.has(guildId)) this.files.set(guildId, new Map());

    this.streams.get(guildId).set(userId, opusStream);
    this.files.get(guildId).set(userId, filePath);

    opusStream.on("end", () => {
      this.streams.get(guildId).delete(userId);
    });

    return filePath;
  }

  async stopRecording(guildId, recordingDir) {
    const guildStreams = this.streams.get(guildId);
    if (guildStreams) {
      for (const [userId, stream] of guildStreams) {
        stream.destroy();
      }
      this.streams.delete(guildId);
    }

    const guildFiles = this.files.get(guildId);
    if (!guildFiles || guildFiles.size === 0) return null;

    const filePaths = Array.from(guildFiles.values());
    const mixedFile = path.join(recordingDir, `mixed-${Date.now()}.mp3`);

    // Mix using FFmpeg
    try {
      await this.mixAudioFiles(filePaths, mixedFile);
      
      // Update metadata with mixed file path
      const metadataPath = path.join(recordingDir, "metadata.json");
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath));
        metadata.mixedFile = path.basename(mixedFile);
        metadata.individualFiles = filePaths.map(f => path.basename(f));
        metadata.endTime = new Date().toISOString();
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      }

      this.files.delete(guildId);
      return {
        mixed: mixedFile,
        individual: filePaths,
      };
    } catch (error) {
      console.error("Error mixing audio files:", error);
      return {
        mixed: null,
        individual: filePaths,
      };
    }
  }

  async mixAudioFiles(inputs, output) {
    if (inputs.length === 0) return;
    if (inputs.length === 1) {
      await execPromise(`ffmpeg -i "${inputs[0]}" -acodec libmp3lame "${output}"`);
      return;
    }

    let filterComplex = "";
    let inputArgs = "";
    inputs.forEach((input, index) => {
      inputArgs += `-i "${input}" `;
      filterComplex += `[${index}:a]`;
    });
    filterComplex += `amix=inputs=${inputs.length}:duration=longest[aout]`;

    const command = `ffmpeg ${inputArgs} -filter_complex "${filterComplex}" -map "[aout]" -acodec libmp3lame "${output}"`;
    await execPromise(command);
  }
}

module.exports = new AudioHandler();
