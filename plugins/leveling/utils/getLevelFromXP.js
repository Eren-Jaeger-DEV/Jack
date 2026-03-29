const xpForLevel = require('./xpForLevel');

function getLevelFromXP(xp) {
  let level = 0;

  while (true) {
    const requiredXP = xpForLevel(level + 1);
    if (xp < requiredXP) break;
    level++;
  }

  return level;
}

module.exports = getLevelFromXP;

