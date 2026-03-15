const { loadImage } = require("canvas");
const path = require("path");

const cache = {
  default: null
};

module.exports = {
  async preloadBackgrounds() {
    try {
      cache.default = await loadImage(path.join(__dirname, "../../../assets/rank-backgrounds/default.png"));
      console.log("✅ Rank card backgrounds preloaded.");
    } catch (err) {
      console.error("❌ Failed to preload default rank background:", err);
    }
  },

  getBackground(name) {
    return cache[name] || cache.default;
  }
};
