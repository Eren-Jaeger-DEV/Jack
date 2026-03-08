const { createCanvas, loadImage } = require("canvas");

module.exports = async (user, level) => {

  const canvas = createCanvas(900, 250);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0f0f0f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffd166";
  ctx.fillRect(0, 0, 10, canvas.height);

  const avatar = await loadImage(user.displayAvatarURL({ extension: "png" }));

  ctx.save();
  ctx.beginPath();
  ctx.arc(120, 125, 70, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 50, 55, 140, 140);
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(`${user.username} leveled up!`, 230, 110);

  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#cccccc";
  ctx.fillText(`You are now level ${level}`, 230, 160);

  return canvas.toBuffer();

};