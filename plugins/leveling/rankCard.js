const { createCanvas, loadImage, registerFont } = require("canvas");
const path = require("path");
const fs = require("fs");
const xpForLevel = require("./utils/xpForLevel");
const { getBackground } = require("./backgroundCache");
const logger = require("../../../bot/utils/logger");

// 10 Second Buffer Cache for Rank Cards
// Key: "guildId-userId", Value: { buffer, timestamp }
const rankCardCache = new Map();

module.exports = async function generateRankCard(member, profile, serverRank, weeklyRank) {
  const cacheKey = `${profile.guildId}-${profile.userId}`;
  const now = Date.now();

  // Check 5-second buffer cache
  if (rankCardCache.has(cacheKey)) {
    const cached = rankCardCache.get(cacheKey);
    if (now - cached.timestamp < 5000) {
      return cached.buffer; // Return the cached buffer if under 5 seconds
    }
  }

  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext("2d");

  // Load Background
  let background;
  if (profile.background && profile.background.startsWith("http")) {
    try {
      background = await loadImage(profile.background);
    } catch (err) {
      logger.warn("Leveling", `Failed to load custom background for user ${profile.userId}. Falling back to default.`);
      background = getBackground("default");
    }
  } else {
    background = getBackground("default");
  }

  // Draw Background
  if (background) {
    // If our background is a dynamic fallback canvas instead of an Image element, this still draws safely.
    ctx.drawImage(background, 0, 0, 900, 300);
  }

  // Dark Overlay to enhance text readability
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, 900, 300);

  // Divider Line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(550, 20);
  ctx.lineTo(550, 280);
  ctx.stroke();

  // LEFT PANEL (Avatar + Player Info)
  
  // Avatar
  const avatarSize = 150;
  const avatarX = 50;
  const avatarY = 75;
  const padding = 30;
  const textStartX = avatarX + avatarSize + padding;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  try {
    const avatar = await loadImage(member.displayAvatarURL({ extension: "png", size: 256 }));
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } catch (err) {}
  ctx.restore();

  // Avatar Border
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Display Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";
  let nameText = member.displayName;
  // Truncate name if too long
  if (nameText.length > 15) nameText = nameText.substring(0, 15) + "...";
  ctx.fillText(nameText, textStartX, 90);

  // Ranks & Weekly Stats
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#bbbbbb";
  
  ctx.fillText("Server Rank:", textStartX, 140);
  const serverRankWidth = ctx.measureText("Server Rank: ").width;
  ctx.fillStyle = "#FFD700";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(`#${serverRank}`, textStartX + serverRankWidth, 140);

  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#bbbbbb";
  ctx.fillText("Weekly Rank:", textStartX, 180);
  const weeklyRankWidth = ctx.measureText("Weekly Rank: ").width;
  ctx.fillStyle = "#FFba00";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(`#${weeklyRank}`, textStartX + weeklyRankWidth, 180);

  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#bbbbbb";
  ctx.fillText("Weekly XP:", textStartX, 220);
  const weeklyXpWidth = ctx.measureText("Weekly XP: ").width;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(profile.weeklyXp.toLocaleString(), textStartX + weeklyXpWidth, 220);

  // RIGHT PANEL (Level + XP)
  
  const currentLevel = profile.level;
  const currentTotalXP = profile.xp;
  const reqXPForCurrent = currentLevel === 0 ? 0 : xpForLevel(currentLevel);
  const reqXPForNext = xpForLevel(currentLevel + 1);

  const xpInLevel = currentTotalXP - reqXPForCurrent;
  const xpNeeded = reqXPForNext - reqXPForCurrent;
  let progress = xpInLevel / xpNeeded;
  if (progress < 0) progress = 0;
  if (progress > 1) progress = 1;

  // Level Text
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFD700";
  ctx.font = "italic bold 70px sans-serif";
  ctx.fillText(currentLevel, 725, 120);
  
  ctx.fillStyle = "#bbbbbb";
  ctx.font = "24px sans-serif";
  ctx.fillText("LEVEL", 725, 50);

  // XP Numbers
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`${currentTotalXP.toLocaleString()} / ${reqXPForNext.toLocaleString()} XP`, 725, 175);

  // Progress Bar
  const barWidth = 280;
  const barHeight = 25;
  const barX = 585;
  const barY = 200;

  // Background Bar
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 12);
  ctx.fill();

  // Foreground Bar
  const currentWidth = Math.max(progress * barWidth, 24); // Minimum width for border radius
  ctx.fillStyle = "#FFD700"; // Gold fill
  drawRoundedRect(ctx, barX, barY, currentWidth, barHeight, 12);
  ctx.fill();

  const outBuffer = canvas.toBuffer();
  
  // Store in cache
  rankCardCache.set(cacheKey, {
    buffer: outBuffer,
    timestamp: now
  });

  return outBuffer;
};

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
