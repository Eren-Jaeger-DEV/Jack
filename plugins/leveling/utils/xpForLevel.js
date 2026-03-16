// Math formula required by user: XP = floor(22.5 * level^2 + 425.6 * level + 52)
module.exports = function xpForLevel(level) {
  if (level < 0) return 0;
  return Math.floor(22.5 * Math.pow(level, 2) + 425.6 * level + 52);
};
