// Zaxine Bot Configuration and Task Scheduler

const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const moment = require("moment-timezone");

module.exports = async ({ api, event }) => {
  const logger = console.log; // You can replace this with a custom logger if needed

  const config = {
    autosetbio: {
      status: true,
      bio: `Prefix: ${global.config.prefix}`
    },
    notification: {
      status: true,
      time: 30 // in minutes
    },
    greetings: {
      status: true,
      morning: "Good morning everyone! Have a great day.",
      afternoon: "Good afternoon! Don't forget to have lunch.",
      evening: "Good evening everyone!",
      sleep: "Good night! Sleep well."
    },
    reminder: {
      status: false,
      time: 40,
      msg: "Remember your scheduled tasks!"
    },
    autoDeleteCache: {
      status: true,
      time: 15
    },
    autoRestart: {
      status: false,
      time: 60
    },
    acceptPending: {
      status: false,
      time: 10
    }
  };

  if (config.autosetbio.status) {
    try {
      api.changeBio(config.autosetbio.bio, err => {
        if (err) logger("Error setting bio:", err);
        else logger("Bio set successfully:", config.autosetbio.bio);
      });
    } catch (e) {
      logger("Error during bio setting:", e);
    }
  }

  if (config.notification.status) {
    setInterval(() => {
      const operator = global.config.adminIDs[0];
      api.sendMessage(
        `Zaxine Bot Information:\n\nTotal Users: ${global.data.allUserID.length}\nGroups: ${global.data.allThreadID.length}\nAdmins: ${global.config.adminIDs.length}`,
        operator
      );
    }, config.notification.time * 60 * 1000);
  }

  if (config.greetings.status) {
    const greetingsList = [
      { time: "06:00", message: config.greetings.morning },
      { time: "12:00", message: config.greetings.afternoon },
      { time: "18:00", message: config.greetings.evening },
      { time: "22:00", message: config.greetings.sleep }
    ];

    setInterval(() => {
      const now = moment().tz("Asia/Dhaka").format("HH:mm");
      const match = greetingsList.find(g => g.time === now);
      if (match) {
        global.data.allThreadID.forEach(threadID => {
          api.sendMessage(match.message, threadID);
        });
      }
    }, 60000); // check every 1 minute
  }

  if (config.reminder.status) {
    setInterval(() => {
      global.data.allThreadID.forEach(threadID => {
        api.sendMessage(config.reminder.msg, threadID);
      });
    }, config.reminder.time * 60 * 1000);
  }

  if (config.autoDeleteCache.status) {
    setInterval(() => {
      try {
        fs.emptyDirSync(path.join(__dirname, "../../scripts/commands/cache"));
        fs.emptyDirSync(path.join(__dirname, "../../scripts/events/cache"));
        logger("Cache cleared successfully.");
      } catch (e) {
        logger("Error clearing cache:", e);
      }
    }, config.autoDeleteCache.time * 60 * 1000);
  }

  if (config.autoRestart.status) {
    setInterval(() => {
      logger("Bot is restarting...");
      process.exit(1);
    }, config.autoRestart.time * 60 * 1000);
  }

  if (config.acceptPending.status) {
    setInterval(async () => {
      const pending = await api.getThreadList(10, null, ["PENDING"]);
      pending.forEach(thread => {
        api.sendMessage("Your message has been accepted.", thread.threadID);
      });
    }, config.acceptPending.time * 60 * 1000);
  }
};
