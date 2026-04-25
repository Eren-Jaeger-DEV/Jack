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
        },
        "image_url": {
          "type": "STRING",
          "description": "Optional: The URL of an image to use as a reference (Image-to-Image). Use this when editing an existing image."
        }
      },
      "required": ["prompt"]
    }
  },

  async execute(args, member, guild) {
    const { prompt, aspect_ratio = "1:1", image_url = null } = args;

    try {
      logger.info("IMAGEN", `Generating image for prompt: ${prompt} ${image_url ? '(Image-to-Image)' : ''}`);

      let baseImageBase64 = null;
      if (image_url) {
        try {
          const imgResponse = await axios.get(image_url, { responseType: 'arraybuffer' });
          baseImageBase64 = Buffer.from(imgResponse.data).toString('base64');
        } catch (e) {
          logger.error("IMAGEN", `Failed to fetch reference image: ${e.message}`);
        }
      }

      // Vertex AI Imagen 3 REST Endpoint
      const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict?key=${VERTEX_KEY}`;

      const instance = { prompt: prompt };
      if (baseImageBase64) {
        instance.image = {
          bytesBase64Encoded: baseImageBase64
        };
      }

      const requestBody = {
        instances: [instance],
        parameters: {
          sampleCount: 1,
          aspectRatio: baseImageBase64 ? undefined : aspect_ratio,
          addWatermark: false,
          includeSafetyAttributes: true,
          // Image Guidance Scale (1.0 - 5.0). Higher = stays closer to original image.
          imageGuidanceScale: baseImageBase64 ? 2.0 : undefined 
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

      const detailsMessage = `🎨 **Jack's Artistic Vision**\n**Prompt:** ${prompt}\n\n*Generated via Imagen 3 | Requested by ${member.user.tag}*`;

      return { 
        success: true, 
        message: "Image generated successfully.",
        files: [attachment],
        secondMessageContent: detailsMessage
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
