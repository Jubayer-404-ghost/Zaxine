const login = require("fca-unofficial");
const fs = require("fs");
const path = require("path");

// Load config
global.config = require("./config.json");

// Load appstate (cookie/session)
const appStatePath = path.join(__dirname, "appstate.json");
if (!fs.existsSync(appStatePath)) {
  console.error("⚠️ appstate.json file not found!");
  process.exit(1);
}
const appState = JSON.parse(fs.readFileSync(appStatePath, "utf8"));

// Login to Facebook
login({ appState }, (err, api) => {
  if (err) {
    console.error("❌ Login failed:", err);
    return;
  }

  // Basic globals
  global.api = api;
  global.data = {
    allUserID: [],
    allThreadID: [],
  };

  // Setup listening
  api.setOptions({
    listenEvents: true,
    selfListen: false,
    logLevel: "silent"
  });

  console.log(`✅ ${global.config.botName} bot started successfully!`);

  // Import commands & events
  const commandPath = path.join(__dirname, "scripts", "cmds");
  const eventPath = path.join(__dirname, "scripts", "events");

  // Load commands
  const commands = new Map();
  fs.readdirSync(commandPath).forEach(file => {
    const command = require(path.join(commandPath, file));
    commands.set(command.name, command);
  });

  // Load events
  const events = [];
  fs.readdirSync(eventPath).forEach(file => {
    const event = require(path.join(eventPath, file));
    events.push(event);
  });

  // Listen for messages/events
  api.listenMqtt((err, event) => {
    if (err) return console.error(err);

    // Handle events
    events.forEach(handler => {
      if (
        handler.config &&
        handler.config.eventType &&
        handler.config.eventType.includes(event.type)
      ) {
        handler.runCmd({ api, event });
      }
    });

    // Handle commands
    if (event.body && event.body.startsWith(global.config.prefix)) {
      const args = event.body.slice(global.config.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = commands.get(commandName);
      if (command) {
        command.runCmd({ api, event, args });
      } else {
        api.sendMessage(global.config.commandNotFoundMessage, event.threadID);
      }
    }
  });

  // Run system functions (auto bio, reminder, etc.)
  require('./run')({ api });
});
