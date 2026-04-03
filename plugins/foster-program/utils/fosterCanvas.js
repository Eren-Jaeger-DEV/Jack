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
 * Generates a high-quality pairing board (Orientation Board).
 * Shows Mentor ↔️ Newbie rows.
 */
async function generatePairingImage(pairs, info = { term: 1, cycle: 1 }) {
  const width = 1000;
  const paddingY = 180;
  const rowHeight = 75;
  const rowSpacing = 15;
  const totalHeight = paddingY + (pairs.length * (rowHeight + rowSpacing)) + 40;
  const canvasHeight = Math.max(800, totalHeight);
  const canvas = createCanvas(width, canvasHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx.roundRect) ctx.roundRect = function(x, y, w, h, r) { return roundRect(this, x, y, w, h, r); };

  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#16213e');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, canvasHeight);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FOSTER PROGRAM | PAIRINGS', width / 2, 80);

  ctx.fillStyle = '#e0e0e0';
  ctx.font = '24px sans-serif';
  ctx.fillText(`TERM ${info.term} • SHUFFLE CYCLE ${info.cycle}`, width / 2, 120);

  ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 250, 145);
  ctx.lineTo(width / 2 + 250, 145);
  ctx.stroke();

  let currentY = paddingY;
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.roundRect(50, currentY, width - 100, rowHeight, 12);
    ctx.fill();

    const mentorAvatar = await loadImage(pair.mentor.avatarURL).catch(() => null);
    if (mentorAvatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(100, currentY + rowHeight / 2, 25, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(mentorAvatar, 75, currentY + rowHeight / 2 - 25, 50, 50);
      ctx.restore();
    }
    
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(pair.mentor.name, 140, currentY + rowHeight / 2 + 8);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('↔️', width / 2, currentY + rowHeight / 2 + 10);

    const newbieAvatar = await loadImage(pair.newbie.avatarURL).catch(() => null);
    if (newbieAvatar) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(width - 100, currentY + rowHeight / 2, 25, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(newbieAvatar, width - 125, currentY + rowHeight / 2 - 25, 50, 50);
      ctx.restore();
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(pair.newbie.name, width - 140, currentY + rowHeight / 2 + 8);

    currentY += rowHeight + rowSpacing;
  }
  return canvas.toBuffer('image/png');
}

/**
 * Generates a side-by-side dual leaderboard (Ranking Board).
 * Shows Top Mentors vs Top Newbies.
 */
async function generateDualLeaderboardImage(data, info = { term: 1, cycle: 1 }) {
  const width = 1200;
  const headerHeight = 180;
  const rowHeight = 60;
  const rowSpacing = 10;
  const maxRows = 10;
  const canvasHeight = headerHeight + (maxRows * (rowHeight + rowSpacing)) + 60;
  const canvas = createCanvas(width, canvasHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx.roundRect) ctx.roundRect = function(x, y, w, h, r) { return roundRect(this, x, y, w, h, r); };

  const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
  gradient.addColorStop(0, '#0f0c29');
  gradient.addColorStop(0.5, '#302b63');
  gradient.addColorStop(1, '#24243e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, canvasHeight);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FOSTER PROGRAM | RANKINGS', width / 2, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = '28px sans-serif';
  ctx.fillText(`TERM ${info.term} • SHUFFLE CYCLE ${info.cycle}`, width / 2, 135);

  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = '#00f2fe';
  ctx.fillText('🏆 TOP ADAPT (MENTORS)', width / 4, headerHeight);
  ctx.fillStyle = '#4facfe';
  ctx.fillText('🏆 TOP PARTNERS (NEWBIE/VETERAN)', (width / 4) * 3, headerHeight);

  const drawCategory = async (list, startX, startY) => {
    let currentY = startY + 40;
    for (let i = 0; i < Math.min(list.length, maxRows); i++) {
        const entry = list[i];
        ctx.fillStyle = i < 3 ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)';
        ctx.roundRect(startX, currentY, (width / 2) - 80, rowHeight, 10);
        ctx.fill();
        ctx.fillStyle = i < 3 ? '#FFD700' : '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${i + 1}`, startX + 20, currentY + (rowHeight / 2) + 8);
        const avatar = await loadImage(entry.avatarURL).catch(() => null);
        if (avatar) {
            ctx.save(); ctx.beginPath(); ctx.arc(startX + 80, currentY + (rowHeight / 2), 22, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(avatar, startX + 58, currentY + (rowHeight / 2) - 22, 44, 44); ctx.restore();
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = i < 3 ? 'bold 22px sans-serif' : '20px sans-serif';
        ctx.fillText(entry.name.substring(0, 16), startX + 120, currentY + (rowHeight / 2) + 8);
        ctx.textAlign = 'right'; ctx.fillStyle = '#FFD700'; ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`${Math.floor(entry.points)}`, startX + (width / 2) - 100, currentY + (rowHeight / 2) + 8);
        currentY += rowHeight + rowSpacing;
    }
  };

  await drawCategory(data.mentors, 40, headerHeight);
  await drawCategory(data.newbies, (width / 2) + 40, headerHeight);
  return canvas.toBuffer('image/png');
}

module.exports = { generatePairingImage, generateDualLeaderboardImage };
