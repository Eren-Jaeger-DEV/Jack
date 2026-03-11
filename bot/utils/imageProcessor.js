const sharp = require('sharp');
const axios = require('axios');

/**
 * Downloads a buffer from a URL, then resizes and compresses it to meet Discord emoji/sticker requirements.
 * Emojis: Max 256KB, typically 128x128 max (will let sharp preserve aspect ratio).
 * Stickers: Max 500KB, EXACTLY 512x512.
 * 
 * @param {string} url - Direct URL to the media
 * @param {string} targetType - 'emoji' or 'sticker'
 * @returns {Promise<{ buffer: Buffer, finalFormat: string, originalFormat: string, size: number }>}
 */
async function processImageForDiscord(url, targetType) {
  // 1. Download the raw buffer
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const rawBuffer = Buffer.from(response.data);

  // Read metadata to determine properties
  const metadata = await sharp(rawBuffer).metadata();
  const format = metadata.format; // 'gif', 'png', 'jpeg', 'webp'
  const isAnimated = format === 'gif' || metadata.pages > 1;

  let pipeline;
  let finalFormat;

  if (targetType === 'emoji') {
    // Emoji:
    // If animated gif, keep it animated and fit to 128x128. Max size 256KB.
    // If static, convert to PNG, fit 128x128, max 256KB.
    if (isAnimated && format === 'gif') {
      // Need to compress GIF. Sharp parses all pages when animated:true
      pipeline = sharp(rawBuffer, { animated: true })
        .resize({ width: 128, height: 128, fit: 'inside' })
        .gif({ colors: 64 }); // Compress colors heavily to stay under 256KB
      finalFormat = 'gif';
    } else {
      pipeline = sharp(rawBuffer)
        .resize({ width: 128, height: 128, fit: 'inside' })
        .png({ quality: 80, compressionLevel: 9 });
      finalFormat = 'png';
    }
  } else if (targetType === 'sticker') {
    // Sticker:
    // Must be PNG (APNG takes too much setup with just Sharp quickly without over-compressing flags, 
    // user requested convert GIF to "supported sticker format... format: PNG, size: 512x512")
    // If it's a GIF, Sharp extracts the first frame by default when animated:false
    pipeline = sharp(rawBuffer)
      .resize({ width: 512, height: 512, fit: 'contain', background: { r:0, g:0, b:0, alpha:0 } })
      .png({ quality: 80, compressionLevel: 9 });
    finalFormat = 'png';
  } else {
    throw new Error('Invalid target format requested. Use "emoji" or "sticker"');
  }

  const processedBuffer = await pipeline.toBuffer();

  return {
    buffer: processedBuffer,
    finalFormat: finalFormat,
    originalFormat: format,
    size: processedBuffer.length
  };
}

module.exports = { processImageForDiscord };
