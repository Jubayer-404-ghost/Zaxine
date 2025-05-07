const login = require("fca-unofficial");
const fs = require("fs");
const path = require("path");

const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
const appState = require("./appstate.json");

const commands = new Map();

// Load commands dynamically
const commandFiles = fs.readdirSync(path.join(__dirname, "commands"));
for (const file of commandFiles) {
  if (file.endsWith(".js")) {
    const command = require(`./commands/${file}`);
    commands.set(command.name, command);
  }
}

login({ appState }, (err, api) => {
  if (err) return console.error("Login failed:", err);
  console.log(`${config.botName} is now online!`);

  api.listenMqtt((err, message) => {
    if (err || !message.body) return;

    const { body, senderID, threadID } = message;
    if (!body.startsWith(config.prefix)) return;

    const args = body.slice(config.prefix.length).trim().split(/\s+/);
    const cmdName = args.shift().toLowerCase();

    const command = commands.get(cmdName);
    if (!command) {
      return api.sendMessage(config.commandNotFoundMessage, threadID);
    }

    // Check admin-only
    if (command.adminOnly && !config.adminIDs.includes(senderID)) {
      return api.sendMessage(config.adminOnlyMessage, threadID);
    }

    // Run command
    try {
      command.run({ api, event: message, args });
    } catch (err) {
      console.error(`Error running command "${cmdName}":`, err);
      api.sendMessage("An error occurred while running the command.", threadID);
    }
  });
});
