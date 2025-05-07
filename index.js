const login = require("fca-unofficial");
const fs = require("fs");
const path = require("path");

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const appState = require("./appstate.json");

const commands = new Map();

// Load commands from scripts/cmds
const cmdFiles = fs.readdirSync(path.join(__dirname, "scripts", "cmds"));
for (const file of cmdFiles) {
  if (file.endsWith(".js")) {
    const command = require(`./scripts/cmds/${file}`);
    commands.set(command.name, command);
  }
}

// Load event handlers from scripts/events
const eventFiles = fs.readdirSync(path.join(__dirname, "scripts", "events"));

login({ appState }, (err, api) => {
  if (err) return console.error("Login failed:", err);

  console.log(`${config.botName} is online!`);

  api.listenMqtt(async (err, event) => {
    if (err) return console.error("Listener error:", err);

    for (const file of eventFiles) {
      const eventHandler = require(`./scripts/events/${file}`);
      await eventHandler({ api, event, commands, config });
    }
  });
});
