module.exports = function ({ api }) {
  const fs = require("fs");
  const path = require("path");

  // Auto bio set (if supported)
  if (global.config.AUTO_BIO) {
    try {
      api.changeBio(global.config.BIO_TEXT || "I'm a bot powered by Zaxine", (err) => {
        if (err) console.error("Failed to set bio:", err);
        else console.log("Bio set successfully!");
      });
    } catch (err) {
      console.error("Error while setting bio:", err);
    }
  }

  // Send greeting message in all threads
  if (global.config.GREETING) {
    global.data.allThreadID.forEach(threadID => {
      api.sendMessage(global.language.greeting || "Hello, I'm online now!", threadID, (err) => {
        if (err) console.error(`Greeting failed in thread ${threadID}:`, err);
      });
    });
  }

  // Custom task runner (for future use)
  console.log("System automation tasks initialized.");
};
