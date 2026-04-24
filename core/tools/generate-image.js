const { VertexAI } = require('@google-cloud/vertexai');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
require('dotenv').config();

// We use the second key for Vertex AI tasks as it has the credits and permissions
const API_KEYS = (process.env.GOOGLE_API_KEYS || "").split(',').map(k => k.trim()).filter(Boolean);
const VERTEX_KEY = API_KEYS[1] || API_KEYS[0]; 
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID || 'jack-420'; // Fallback if not in env
const LOCATION = 'us-central1'; // Imagen 3 is most stable here

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

      // Initialize Vertex AI with the specific key and project
      // Note: In a real Vertex setup, we usually use Service Accounts, 
      // but if the user provided a Vertex-enabled API Key, we'll try the direct route.
      const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION, key: VERTEX_KEY });
      const generativeModel = vertexAI.getGenerativeModel({
        model: 'imagen-3.0-generate-001',
      });

      // Request generation
      const request = {
        prompt: prompt,
        parameters: {
          sampleCount: 1,
          aspectRatio: aspect_ratio,
          includeSafetyAttributes: true
        }
      };

      const response = await generativeModel.generateContent(request);
      
      // Handle the response (Imagen returns base64 images)
      const prediction = response.response.candidates[0];
      if (!prediction || !prediction.image) {
        return { success: false, message: "Imagen failed to generate an image. It might have been blocked by safety filters." };
      }

      const imageBuffer = Buffer.from(prediction.image.bytesBase64, 'base64');
      const attachment = new AttachmentBuilder(imageBuffer, { name: 'jack-gen.png' });

      // Create a beautiful embed to showcase the art
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
      logger.error("IMAGEN", `Generation Error: ${error.message}`);
      
      // Fallback: If Vertex AI fails due to auth/config, tell the user how to fix it
      return { 
        success: false, 
        message: `Image generation failed: ${error.message}. Make sure the GOOGLE_PROJECT_ID is correct in your .env and Imagen 3 is enabled in your Google Cloud console.` 
      };
    }
  }
};
