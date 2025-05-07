module.exports = {
  name: "ping",
  description: "Check bot status",
  adminOnly: false,

  run({ api, event, args }) {
    api.sendMessage("Pong!", event.threadID);
  }
};
