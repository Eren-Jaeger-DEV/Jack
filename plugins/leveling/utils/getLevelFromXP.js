const xpForLevel = require("./xpForLevel");

module.exports = function getLevelFromXP(xp) {
  let level = 0;
  while (xp >= xpForLevel(level)) {
    level++;
  }
  return level - 1;
};
