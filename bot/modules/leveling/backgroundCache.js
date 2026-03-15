const { loadImage } = require("canvas");
const path = require("path");

const cache = {
  default: null
};

module.exports = {
  async preloadBackgrounds() {
    const defaultPath = path.join(__dirname, "../../../assets/rank-backgrounds/default.png");
    try {
      cache.default = await loadImage(defaultPath);
      console.log("✅ Rank card backgrounds preloaded.");
    } catch (err) {
      console.log(`⚠ Warning: Missing default background at ${defaultPath}. Creating fallback.`);
      
      // Create dynamic fallback
      const { createCanvas } = require("canvas");
      const fallbackCanvas = createCanvas(900, 300);
      const ctx = fallbackCanvas.getContext("2d");
      ctx.fillStyle = "#1e1e1e"; // Sleek dark grey
      ctx.fillRect(0, 0, 900, 300);
      
      cache.default = fallbackCanvas;
    }
  },

  getBackground(name) {
    return cache[name] || cache.default;
  }
};
