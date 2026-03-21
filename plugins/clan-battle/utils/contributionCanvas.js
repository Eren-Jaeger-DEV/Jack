const { createCanvas, loadImage } = require('canvas');

/**
 * Utility to draw rounded rectangles on canvas.
 */
function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  return ctx;
}

/**
 * Generates a game-style leaderboard image for clan contributions.
 * 
 * @param {Array} players - Array of { name, today, total, avatarURL }
 * @param {number} page - Current page number
 * @returns {Promise<Buffer>} - PNG image buffer
 */
async function generateContributionImage(players, page = 0) {
  const width = 850;
  const paddingY = 160;
  const rowsPerPage = 10;
  const startRank = page * rowsPerPage;

  // Calculate dynamic height based on players (max 10)
  let totalHeight = paddingY + 20; // Initial padding + bottom buffer
  for (let i = 0; i < players.length; i++) {
    const globalRank = startRank + i + 1;
    let rh = (globalRank <= 3) ? 85 : 55;
    totalHeight += rh + 12; // Height + spacing
  }

  // Final canvas height (minimum 700 to look consistent)
  const canvasHeight = Math.max(700, totalHeight);
  const canvas = createCanvas(width, canvasHeight);
  const ctx = canvas.getContext('2d');

  // Polyfill roundRect if needed
  if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, w, h, r) {
      return roundRect(this, x, y, w, h, r);
    };
  }

  // 1. Background Gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGradient.addColorStop(0, '#151520');
  bgGradient.addColorStop(1, '#090910');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, canvasHeight);

  // 2. Header
  ctx.fillStyle = '#FFD700'; // Gold header
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Contribution Point Rankings', width / 2, 60);

  // Gold separator line
  ctx.beginPath();
  ctx.moveTo(width / 2 - 220, 100);
  ctx.lineTo(width / 2 + 220, 100);
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 3. Column Headers
  ctx.fillStyle = '#888899';
  ctx.font = 'bold 18px sans-serif';
  
  ctx.textAlign = 'left';
  ctx.fillText('MEMBER', 180, 135);
  
  ctx.textAlign = 'center';
  ctx.fillText('⚡ TODAY', width / 2 + 50, 135);
  
  ctx.textAlign = 'right';
  ctx.fillText('🔥 TOTAL', width - 80, 135);

  let currentY = paddingY;

  // 4. Render Player Rows
  // Pre-load all avatars in parallel to speed up generation
  const avatars = await Promise.all(
    players.map(p => loadImage(p.avatarURL).catch(() => null))
  );

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const avatar = avatars[i];
    const globalRank = startRank + i + 1;
    const isTop3 = globalRank <= 3;
    const isTop6 = globalRank <= 6;
    const itemHeight = isTop3 ? 85 : 55;

    let rowColor = 'rgba(255, 255, 255, 0.04)';
    let medalColor = '#666677';
    let borderColor = 'rgba(255, 255, 255, 0.1)';
    let nameColor = '#e0e0e0';

    // Ranks 1-3: Medals & Strong Highlights
    if (globalRank === 1) {
      rowColor = 'rgba(255, 215, 0, 0.15)'; // Gold
      medalColor = '#FFD700';
      borderColor = 'rgba(255, 215, 0, 0.6)';
      nameColor = '#ffffff';
    } else if (globalRank === 2) {
      rowColor = 'rgba(192, 192, 192, 0.12)'; // Silver
      medalColor = '#C0C0C0';
      borderColor = 'rgba(192, 192, 192, 0.6)';
      nameColor = '#ffffff';
    } else if (globalRank === 3) {
      rowColor = 'rgba(205, 127, 50, 0.1)'; // Bronze
      medalColor = '#CD7F32';
      borderColor = 'rgba(205, 127, 50, 0.6)';
      nameColor = '#ffffff';
    } 
    // Ranks 4-6: Soft Highlights
    else if (globalRank >= 4 && globalRank <= 6) {
      rowColor = 'rgba(255, 255, 255, 0.08)';
      borderColor = 'rgba(255, 255, 255, 0.2)';
    }

    // Shadow for highlights
    if (isTop6) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
    }

    // Draw Row Background
    ctx.fillStyle = rowColor;
    ctx.roundRect(40, currentY, width - 80, itemHeight, 14);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Row Border for top 6
    if (isTop6) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Rank Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = medalColor;
    ctx.font = isTop3 ? 'bold 32px sans-serif' : 'bold 22px sans-serif';
    ctx.fillText(String(globalRank), 85, currentY + itemHeight / 2);

    // Avatar
    let avatarX = 145;
    let radius = isTop3 ? 28 : 20;
    
    if (avatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, currentY + itemHeight / 2, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX - radius, currentY + itemHeight / 2 - radius, radius * 2, radius * 2);
      ctx.restore();
      
      // Avatar border for top 3
      if (isTop3) {
        ctx.beginPath();
        ctx.arc(avatarX, currentY + itemHeight / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = medalColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      // Default placeholder if avatar fails
      ctx.fillStyle = '#333344';
      ctx.beginPath();
      ctx.arc(avatarX, currentY + itemHeight / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Member Name (Left Aligned)
    ctx.textAlign = 'left';
    ctx.fillStyle = nameColor;
    ctx.font = isTop3 ? 'bold 24px sans-serif' : 'bold 20px sans-serif';
    ctx.fillText(player.name, 200, currentY + itemHeight / 2);

    // Today Points (Center Aligned)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#CCCCCC';
    ctx.font = isTop3 ? '22px sans-serif' : '20px sans-serif';
    ctx.fillText(String(player.today), width / 2 + 50, currentY + itemHeight / 2);

    // Total Points (Right Aligned)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700'; // Total is consistently gold/important
    ctx.font = isTop3 ? 'bold 26px sans-serif' : 'bold 22px sans-serif';
    ctx.fillText(String(player.total), width - 90, currentY + itemHeight / 2);

    currentY += itemHeight + 12;
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateContributionImage };
