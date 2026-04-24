const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const logger = require('../../utils/logger');
require('dotenv').config();

// We use the second key for Vertex AI tasks
const API_KEYS = (process.env.GOOGLE_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
const VERTEX_KEY = API_KEYS[1] || API_KEYS[0]; 
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'jack-489112';
const LOCATION = 'us-central1'; 

module.exports = {
  schema: {
    "name": "generate_image",
    "description": "CREATIVE: Generate a high-quality image based on a text prompt using Imagen 3.",
    "parameters": {
      "type": "OBJECT",
      "properties": {
        "prompt": {
          "type": "STRING",
          "description": "A detailed description of the image to generate."
        },
        "aspect_ratio": {
          "type": "STRING",
          "enum": ["1:1", "4:3", "3:4", "16:9", "9:16"],
          "description": "The aspect ratio of the generated image."
        }
      },
      "required": ["prompt"]
    }
  },

  async execute(args, member, guild) {
    const { prompt, aspect_ratio = "1:1" } = args;

    try {
      logger.info("IMAGEN", `Generating image for prompt: ${prompt}`);

      // Vertex AI Imagen 3 REST Endpoint
      const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict?key=${VERTEX_KEY}`;

      const requestBody = {
        instances: [
          { prompt: prompt }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: aspect_ratio,
          addWatermark: false,
          includeSafetyAttributes: true
        }
      };

      const response = await axios.post(url, requestBody, {
        headers: { 'Content-Type': 'application/json' }
      });

      const prediction = response.data?.predictions?.[0];
      if (!prediction || !prediction.bytesBase64Encoded) {
        return { success: false, message: "Imagen failed to generate an image. Check your Google Cloud quota and safety filters." };
      }

      const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'jack-gen.png' });

      const embed = new EmbedBuilder()
        .setTitle("🎨 Jack's Artistic Vision")
        .setDescription(`**Prompt:** ${prompt}`)
        .setImage('attachment://jack-gen.png')
        .setColor('#FF00FF')
        .setFooter({ text: `Generated via Imagen 3 | Requested by ${member.user.tag}` })
        .setTimestamp();

      return { 
        success: true, 
        message: "Image generated successfully.",
        files: [attachment],
        embeds: [embed]
      };

    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error("IMAGEN", `REST Error: ${errorMsg}`);
      return { 
        success: false, 
        message: `Image generation failed: ${errorMsg}` 
      };
    }
  }
};
