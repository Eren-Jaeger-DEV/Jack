function xpForLevel(level) {
  if (level === 0) return 0;
  return 20 * level * level - 20 * level + 35;
}

module.exports = xpForLevel;

