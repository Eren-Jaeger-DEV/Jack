const { createCanvas, loadImage } = require("canvas");

module.exports = async (user, data, serverRank, weeklyRank) => {

  const canvas = createCanvas(1000, 300);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffd166";
  ctx.fillRect(0, 0, 15, canvas.height);

  const avatar = await loadImage(user.displayAvatarURL({ extension: "png" }));

  ctx.save();
  ctx.beginPath();
  ctx.arc(120, 150, 80, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 40, 70, 160, 160);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(user.username.toUpperCase(), 250, 90);

  ctx.font = "24px sans-serif";

  ctx.fillText(`SERVER RANK`, 250, 150);
  ctx.fillText(`#${serverRank}`, 250, 180);

  ctx.fillText(`WEEKLY RANK`, 420, 150);
  ctx.fillText(`#${weeklyRank}`, 420, 180);

  ctx.fillText(`WEEKLY XP`, 590, 150);
  ctx.fillText(`${data.weeklyXp}`, 590, 180);

  ctx.fillText(`LEVEL`, 800, 90);
  ctx.fillText(`${data.level}`, 800, 120);

  const required = Math.pow(data.level, 2) * 100;

  ctx.fillText(`EXP`, 800, 170);
  ctx.fillText(`${data.xp} / ${required}`, 800, 200);

  const barWidth = 700;
  const barHeight = 20;

  ctx.fillStyle = "#333";
  ctx.fillRect(250, 230, barWidth, barHeight);

  const progress = (data.xp / required) * barWidth;

  ctx.fillStyle = "#ffd166";
  ctx.fillRect(250, 230, progress, barHeight);

  return canvas.toBuffer();

};