const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const sharp = require('sharp');
const logger = require('../../utils/logger');

module.exports = {
  schema: {
    "name": "crop_image",
    "description": "Surgical Crop: Cut out a specific part of an image without redrawing it. Use this for literal extractions (e.g. cropping a person or object).",
    "parameters": {
      "type": "OBJECT",
      "properties": {
        "image_url": {
          "type": "STRING",
          "description": "The URL of the image to crop."
        },
        "ymin": { "type": "NUMBER", "description": "Top coordinate (0-1000)" },
        "xmin": { "type": "NUMBER", "description": "Left coordinate (0-1000)" },
        "ymax": { "type": "NUMBER", "description": "Bottom coordinate (0-1000)" },
        "xmax": { "type": "NUMBER", "description": "Right coordinate (0-1000)" },
        "label": { "type": "STRING", "description": "What is being cropped (e.g. 'Character Portrait')" }
      },
      "required": ["image_url", "ymin", "xmin", "ymax", "xmax"]
    }
  },

  async execute(args, member, guild) {
    const { image_url, ymin, xmin, ymax, xmax, label = "Cropped Extraction" } = args;

    try {
      addLog("CROP_TOOL", `Executing surgical crop on ${label}`);

      // 1. Fetch the image
      const response = await axios.get(image_url, { responseType: 'arraybuffer' });
      const inputBuffer = Buffer.from(response.data);

      // 2. Get image dimensions
      const metadata = await sharp(inputBuffer).metadata();
      const width = metadata.width;
      const height = metadata.height;

      // 3. Convert 0-1000 normalized coordinates to pixel coordinates
      const left = Math.floor((xmin / 1000) * width);
      const top = Math.floor((ymin / 1000) * height);
      const cropWidth = Math.floor(((xmax - xmin) / 1000) * width);
      const cropHeight = Math.floor(((ymax - ymin) / 1000) * height);

      // 4. Perform the crop
      const outputBuffer = await sharp(inputBuffer)
        .extract({ left, top, width: cropWidth, height: cropHeight })
        .toBuffer();

      const attachment = new AttachmentBuilder(outputBuffer, { name: 'jack-crop.png' });

      const embed = new EmbedBuilder()
        .setTitle(`✂️ Jack's Precision Extraction`)
        .setDescription(`Successfully extracted: **${label}**`)
        .setImage('attachment://jack-crop.png')
        .setColor('#00FFFF')
        .setFooter({ text: `Surgical Crop | Requested by ${member.user.tag}` });

      return {
        success: true,
        message: "Image cropped successfully.",
        files: [attachment],
        embeds: [embed]
      };

    } catch (error) {
      logger.error("CROP_TOOL", `Crop Error: ${error.message}`);
      return {
        success: false,
        message: `Failed to crop image: ${error.message}`
      };
    }
  }
};

function addLog(tag, msg) {
  logger.info(tag, msg);
}
