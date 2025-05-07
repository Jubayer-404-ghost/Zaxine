const login = require("fca-unofficial");
const fs = require("fs");
const path = require("path");

// Load config and appState
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const appState = require("./appstate.json");

// Map for commands
const commands = new Map();

// Load commands from /scripts/cmds/
const cmdPath = path.join(__dirname, "scripts", "cmds");
fs.readdirSync(cmdPath).forEach(file => {
  if (file.endsWith(".js")) {
    const cmd = require(path.join(cmdPath, file));
    if (cmd.name && cmd.run) {
      commands.set(cmd.name, cmd);
    }
  }
});

// Load event handlers from /scripts/events/
const eventHandlers = [];
const eventPath = path.join(__dirname, "scripts", "events");
fs.readdirSync(eventPath).forEach(file => {
  const eventFile = require(path.join(eventPath, file));
  if (eventFile.config && eventFile.run) {
    eventHandlers.push(eventFile);
  }
});

// Login with appState
login({ appState }, (err, api) => {
  if (err) return console.error("Login failed:", err);
  console.log(`${config.botName} is now online!`);

  api.listenMqtt(async (err, event) => {
    if (err || !event) return;

    // ========== Command Handler ==========
    if (event.type === "message" && event.body && event.body.startsWith(config.prefix)) {
      const args = event.body.slice(config.prefix.length).trim().split(/\s+/);
      const cmdName = args.shift().toLowerCase();

      const command = commands.get(cmdName);
      if (!command) {
        return api.sendMessage(config.commandNotFoundMessage, event.threadID);
      }

      // Admin-only check
      if (command.adminOnly && !config.adminIDs.includes(event.senderID)) {
        return api.sendMessage(config.adminOnlyMessage, event.threadID);
      }

      try {
        await command.run({ api, event, args, config });
      } catch (err) {
        console.error(`Error in command "${cmdName}":`, err);
        api.sendMessage("Command execution failed.", event.threadID);
      }
    }

    // ========== Event Handler ==========
    for (const handler of eventHandlers) {
      if (handler.config.eventType.includes(event.type)) {
        try {
          await handler.run({ api, event, config, commands });
        } catch (e) {
          console.error(`Error in event "${handler.config.name}":`, e);
        }
      }
    }
  });
});
