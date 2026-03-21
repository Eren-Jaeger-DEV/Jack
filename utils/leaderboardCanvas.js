const { createCanvas, loadImage } = require('canvas');

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

async function generateLeaderboardImage(players, page = 0) {
  const width = 850;
  const paddingY = 160;
  
  const startRank = page * 15;

  let totalHeight = paddingY + 20; // 20px padding at bottom
  
  // Calculate height dynamically
  for (let i = 0; i < players.length; i++) {
    const globalRank = startRank + i + 1;
    let rh = (globalRank <= 3) ? 85 : 55;
    totalHeight += rh + 12; // 12px spacing between rows
  }

  const canvas = createCanvas(width, Math.max(600, totalHeight));
  const ctx = canvas.getContext('2d');

  if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, w, h, r) {
      return roundRect(this, x, y, w, h, r);
    };
  }

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 0, totalHeight);
  gradient.addColorStop(0, '#151520');
  gradient.addColorStop(1, '#090910');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, canvas.height);

  // Header "SEASON RANKINGS"
  ctx.fillStyle = '#ff6b00';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SEASON RANKINGS', width / 2, 60);

  // Divider
  ctx.beginPath();
  ctx.moveTo(width / 2 - 150, 95);
  ctx.lineTo(width / 2 + 150, 95);
  ctx.strokeStyle = 'rgba(255, 107, 0, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Column Headers
  ctx.fillStyle = '#888899';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PLAYER', 180, 130);
  
  ctx.textAlign = 'center';
  ctx.fillText('⚡ WEEKLY', width / 2 + 50, 130);
  
  ctx.textAlign = 'right';
  ctx.fillText('🔥 SEASON', width - 80, 130);

  let currentY = paddingY;

  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const globalRank = startRank + i + 1;
    const isTop3 = globalRank <= 3;
    const isTop5 = globalRank <= 5;
    const itemHeight = isTop3 ? 85 : 55;

    let rowColor = 'rgba(255, 255, 255, 0.04)';
    let medalColor = '#666677';
    let borderColor = 'rgba(255,255,255,0.1)';
    let rankText = String(globalRank);

    if (globalRank === 1) {
      rowColor = 'rgba(255, 215, 0, 0.15)';
      medalColor = '#ffd700'; // Gold
      borderColor = 'rgba(255, 215, 0, 0.6)';
    } else if (globalRank === 2) {
      rowColor = 'rgba(192, 192, 192, 0.12)';
      medalColor = '#c0c0c0'; // Silver
      borderColor = 'rgba(192, 192, 192, 0.6)';
    } else if (globalRank === 3) {
      rowColor = 'rgba(205, 127, 50, 0.1)';
      medalColor = '#cd7f32'; // Bronze
      borderColor = 'rgba(205, 127, 50, 0.6)';
    } else if (globalRank === 4 || globalRank === 5) {
      rowColor = 'rgba(255, 255, 255, 0.08)'; // Subtle highlight
      borderColor = 'rgba(255, 255, 255, 0.25)'; // Subtle border
    }

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Row Background
    ctx.fillStyle = rowColor;
    ctx.roundRect(40, currentY, width - 80, itemHeight, 12);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Optional border for top 5
    if (isTop5) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Rank Number
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = medalColor;
    ctx.font = isTop3 ? 'bold 30px sans-serif' : 'bold 20px sans-serif';
    ctx.fillText(rankText, 80, currentY + itemHeight / 2);

    // Avatar
    let avatarX = 140;
    let radius = isTop3 ? 26 : 18;
    
    try {
      const avatar = await loadImage(player.avatarURL);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX, currentY + itemHeight / 2, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(avatar, avatarX - radius, currentY + itemHeight / 2 - radius, radius * 2, radius * 2);
      ctx.restore();
      
      // Avatar border
      if (isTop3) {
        ctx.beginPath();
        ctx.arc(avatarX, currentY + itemHeight / 2, radius, 0, Math.PI * 2);
        ctx.strokeStyle = medalColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } catch (e) {
      ctx.fillStyle = '#333344';
      ctx.beginPath();
      ctx.arc(avatarX, currentY + itemHeight / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Name (Left aligned)
    ctx.textAlign = 'left';
    ctx.fillStyle = isTop3 ? '#ffffff' : '#e0e0e0';
    ctx.font = isTop3 ? 'bold 24px sans-serif' : 'bold 20px sans-serif';
    ctx.fillText(player.name, 190, currentY + itemHeight / 2);

    // Weekly Energy (Center aligned)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cccccc';
    ctx.font = isTop3 ? '22px sans-serif' : '20px sans-serif';
    ctx.fillText(String(player.weekly), width / 2 + 50, currentY + itemHeight / 2);

    // Season Energy (Right aligned)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6b00';
    ctx.font = isTop3 ? 'bold 26px sans-serif' : 'bold 22px sans-serif';
    ctx.fillText(String(player.season), width - 80, currentY + itemHeight / 2);

    currentY += itemHeight + 12; // 12px gap
  }

  return canvas.toBuffer('image/png');
}

module.exports = { generateLeaderboardImage };
