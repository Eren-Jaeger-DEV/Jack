
module.exports = {

  name: "prefixtest",
  category: "utility",
  description: "Test prefix system",
  aliases: ["testprefix","prefix"],
  usage: "j prefixtest",
  details: "Tests that the prefix system is working correctly.",


  async run(ctx) {

    ctx.reply("✅ Prefix system working.");

  }

};