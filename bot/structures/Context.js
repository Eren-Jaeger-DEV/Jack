class Context {

  constructor(client, source, args = []) {

    this.client = client;
    this.source = source;
    this.args = args;

    this.isInteraction = typeof source.isChatInputCommand === "function";

    /* slash / prefix identifier — used by commands for branching */
    this.type = this.isInteraction ? "slash" : "prefix";

    /* raw handles so commands can access interaction.options / message.mentions */
    this.interaction = this.isInteraction ? source : null;
    this.message = this.isInteraction ? null : source;

    this.user = source.user || source.author;
    this.member = source.member;
    this.guild = source.guild;
    this.channel = source.channel;

    this.options = this.isInteraction ? source.options : null;

  }

  async reply(data) {

    try {

      if (this.isInteraction) {

        if (this.source.deferred || this.source.replied) {
          return await this.source.followUp(data);
        }

        return await this.source.reply(data);
      }

      return await this.channel.send(data);

    } catch (err) {
      if (err?.code === 10062) {
        console.warn("Reply skipped: interaction expired (10062).");
        return null;
      }

      console.error("Reply error:", err);
    }

  }

  async defer(options = {}) {

    if (this.isInteraction) {
      return this.source.deferReply(options);
    }

  }

}

module.exports = Context;