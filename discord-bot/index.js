require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config/config');

// ─── Client Setup ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

client.commands = new Collection();

// ─── Load Commands ────────────────────────────────────────────────────────────
function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if (command?.data?.name) {
          client.commands.set(command.data.name, command);
          console.log(`  ✅ Loaded command: /${command.data.name}`);
        }
      } catch (err) {
        console.error(`  ❌ Failed to load ${fullPath}:`, err.message);
      }
    }
  }
}

console.log('\n📦 Loading commands...');
loadCommands(path.join(__dirname, 'commands'));
console.log(`   ${client.commands.size} commands loaded\n`);

// ─── Load Events ──────────────────────────────────────────────────────────────
console.log('📡 Loading events...');
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`  ✅ Loaded event: ${event.name}`);
}

// ─── Error Handling ───────────────────────────────────────────────────────────
process.on('unhandledRejection', err => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

client.on('error', err => console.error('Discord client error:', err));
client.on('warn', msg => console.warn('Discord warning:', msg));

// ─── Login ────────────────────────────────────────────────────────────────────
if (!config.token) {
  console.error('❌ DISCORD_TOKEN is missing from your .env file!');
  process.exit(1);
}

client.login(config.token);
