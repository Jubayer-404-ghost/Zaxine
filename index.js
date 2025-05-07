const login = require("fca-unofficial");
const fs = require("fs");

// Load config
const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const appState = require("./appstate.json");

// Login with appstate
login({ appState }, (err, api) => {
  if (err) return console.error("Login failed:", err);

  console.log(`${config.botName} is now online!`);

  // Listen for messages
  api.listenMqtt((err, message) => {
    if (err || !message.body) return;

    const prefix = config.prefix;
    const senderID = message.senderID;
    const msg = message.body;

    // Simple "hi" auto-reply
    if (msg.toLowerCase() === "hi") {
      return api.sendMessage(`Hello! I'm ${config.botName}.`, message.threadID);
    }

    // Prefix-based command example
    if (msg.startsWith(prefix)) {
      const args = msg.slice(prefix.length).trim().split(/\s+/);
      const command = args[0].toLowerCase();

      if (command === "ping") {
        return api.sendMessage("Pong!", message.threadID);
      }

      // Unknown command
      return api.sendMessage(config.commandNotFoundMessage, message.threadID);
    }
  });
});
