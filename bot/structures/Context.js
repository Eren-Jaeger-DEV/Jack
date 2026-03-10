class Context {

  constructor(client, source, args = []) {

    this.client = client;
    this.source = source;
    this.args = args;

    this.isInteraction = typeof source.isChatInputCommand === "function";

    this.user = source.user || source.author;
    this.member = source.member;
    this.guild = source.guild;
    this.channel = source.channel;

  }

  async reply(data) {

    if (this.isInteraction) {

      if (this.source.deferred || this.source.replied) {
        return this.source.followUp(data);
      }

      return this.source.reply(data);
    }

    return this.channel.send(data);
  }

  async defer() {

    if (this.isInteraction) {
      return this.source.deferReply();
    }

  }

  get options() {

    if (!this.isInteraction) return {};

    return this.source.options;

  }

}

module.exports = Context;