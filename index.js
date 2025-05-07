const login = require("fca-unofficial");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const appState = require("./appstate.json");

// ===== Load commands =====
const commands = new Map();
const cmdsPath = path.join(__dirname, "scripts", "cmds");

fs.readdirSync(cmdsPath).forEach(file => {
  if (file.endsWith(".js")) {
    const cmd = require(path.join(cmdsPath, file));
    if (cmd.name && typeof cmd.run === "function") {
      commands.set(cmd.name, cmd);
    }
  }
});

// ===== Load events using runCmd only =====
const eventHandlers = [];
const eventsPath = path.join(__dirname, "scripts", "events");

fs.readdirSync(eventsPath).forEach(file => {
  const code = fs.readFileSync(path.join(eventsPath, file), "utf8");
  const context = { runCmd: null };
  vm.createContext(context);
  try {
    vm.runInContext(code, context);
    if (typeof context.runCmd === "function") {
      eventHandlers.push(context.runCmd);
    }
  } catch (e) {
    console.error(`Error loading event file ${file}:`, e);
  }
});

// ===== Login and Listen =====
login({ appState }, (err, api) => {
  if (err) return console.error("Login failed:", err);
  console.log(`${config.botName || "Zaxine"} is now online.`);

  api.setOptions({ listenEvents: true });

  api.listenMqtt(async (err, event) => {
    if (err || !event) return;

    // === Command Handler ===
    if (event.type === "message" && event.body?.startsWith(config.prefix)) {
      const args = event.body.slice(config.prefix.length).trim().split(/\s+/);
      const cmdName = args.shift().toLowerCase();
      const command = commands.get(cmdName);

      if (!command) return api.sendMessage(config.commandNotFoundMessage || "Command not found.", event.threadID);

      // Admin Check (optional)
      if (command.adminOnly && !config.adminIDs.includes(event.senderID)) {
        return api.sendMessage(config.adminOnlyMessage || "Only admin can use this command.", event.threadID);
      }

      try {
        await command.run({ api, event, args, config });
      } catch (err) {
        console.error(`Error running command ${cmdName}:`, err);
        api.sendMessage("Command execution error.", event.threadID);
      }
    }

    // === Event Handlers ===
    for (const handle of eventHandlers) {
      try {
        await handle({ api, event, config, commands });
      } catch (err) {
        console.error("Error in event handler:", err);
      }
    }
  });
});
