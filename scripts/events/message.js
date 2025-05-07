module.exports = async function ({ api, event, commands, config }) {
  const { body, senderID, threadID } = event;

  if (!body || !body.startsWith(config.prefix)) return;

  const args = body.slice(config.prefix.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const command = commands.get(commandName);
  if (!command) {
    return api.sendMessage(config.commandNotFoundMessage, threadID);
  }

  if (command.adminOnly && !config.adminIDs.includes(senderID)) {
    return api.sendMessage(config.adminOnlyMessage, threadID);
  }

  try {
    await command.run({ api, event, args });
  } catch (err) {
    console.error(`Error in command ${commandName}:`, err);
    api.sendMessage("Error while executing command.", threadID);
  }
};
