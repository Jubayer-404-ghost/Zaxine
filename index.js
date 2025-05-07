const login = require('@dongdev/fca-unofficial');
const fs = require('fs');
const path = require('path');

// Load config
const config = require('./config.json');
global.config = config;

// Load language
const language = JSON.parse(fs.readFileSync(path.join(__dirname, 'language', 'en.lang'), 'utf8'));
global.language = language;

// Initialize data store
global.data = {
  allUserID: [],
  allThreadID: [],
};

// Login
login({ email: config.EMAIL, password: config.PASSWORD }, async (err, api) => {
  if (err) {
    console.error('[LOGIN ERROR]', err);
    return;
  }

  api.setOptions({
    listenEvents: true,
    selfListen: false,
    forceLogin: true,
    logLevel: "silent"
  });

  // Store API globally
  global.api = api;

  // Load threads and users
  const threads = await api.getThreadList(100, null, ['INBOX']);
  threads.forEach(thread => global.data.allThreadID.push(thread.threadID));

  const users = new Set();
  threads.forEach(thread => {
    if (thread.participants) {
      thread.participants.forEach(uid => users.add(uid));
    }
  });
  global.data.allUserID = Array.from(users);

  console.log(language.start_success || "Bot is running...");

  // Load event handlers
  const eventDir = path.join(__dirname, 'scripts', 'events');
  fs.readdirSync(eventDir).forEach(file => {
    const handler = require(path.join(eventDir, file));
    if (typeof handler === 'function') {
      api.listenMqtt(event => handler({ api, event }));
    }
  });

  // Load background system features
  const systemPath = path.join(__dirname, 'scripts', 'system', 'auto.js');
  if (fs.existsSync(systemPath)) {
    const autoFeatures = require(systemPath);
    if (typeof autoFeatures === 'function') {
      autoFeatures({ api });
    }
  }
});
