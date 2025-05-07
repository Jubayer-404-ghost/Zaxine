const fs = require("fs");
const login = require("fb-chat-api");
const path = require("path");

// Load configuration
const config = require("./config.json");
global.config = config;

// Load language
const langData = JSON.parse(fs.readFileSync("./language/en.lang", "utf-8"));
global.lang = langData;

// Load appstate (Facebook session)
const appStateFile = fs.readFileSync("appstate.json", "utf-8");
const appState = JSON.parse(appStateFile);

// Create global storage
global.api = null;
global.data = {
  allThreadID: [],
  allUserID: []
};

// Setup command and event collections
const commands = new Map();
const events = [];

function loadCommands() {
  const commandPath = path.join(__dirname, "scripts", "cmds");
  fs.readdirSync(commandPath).forEach(file => {
    if (file.endsWith(".js")) {
      const command = require(path.join(commandPath, file));
      commands.set(command.config.name, command);
    }
  });
}

function loadEvents(api) {
  const eventPath = path.join(__dirname, "scripts", "events");
  fs.readdirSync(eventPath).forEach(file => {
    if (file.endsWith(".js")) {
      const event = require(path.join(eventPath, file));
      events.push({ eventType: event.config.eventType, runCmd: event.runCmd });
    }
  });

  api.listenMqtt(async (err, event) => {
    if (err) return console.error("Listen Error:", err);

    // Check for events
    for (let evt of events) {
      if (evt.eventType.includes(event.type)) {
        try {
          await evt.runCmd({ api, event });
        } catch (e) {
          console.error("Event Error:", e);
        }
      }
    }

    // Check for commands
    if (event.body && event.body.startsWith(config.prefix)) {
      const args = event.body.slice(config.prefix.length).trim().split(/\s+/);
      const cmdName = args.shift().toLowerCase();
      const cmd = commands.get(cmdName);
      if (cmd) {
        try {
          await cmd.runCmd({ api, event, args });
        } catch (e) {
          api.sendMessage(langData.commandError || "There was an error executing the command.", event.threadID);
          console.error("Command Error:", e);
        }
      } else {
        api.sendMessage(langData.commandNotFound || "Command not found!", event.threadID);
      }
    }
  });
}

// Login to Facebook
login({ appState }, (err, api) => {
  if (err) {
    console.error(langData.loginFailed || "Login failed:", err);
    return;
  }

  global.api = api;

  // Load user and thread data
  api.getThreadList(100, null, ["INBOX"], (err, data) => {
    if (!err && data) {
      global.data.allThreadID = data.map(thread => thread.threadID);
    }
  });

  api.getFriendsList((err, data) => {
    if (!err && data) {
      global.data.allUserID = data.map(user => user.userID);
    }
  });

  // Load all commands and events
  loadCommands();
  loadEvents(api);

  console.log(langData.botStarted || "Zaxine bot is now running!");
});
