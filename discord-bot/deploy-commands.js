require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

function collectCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectCommands(fullPath);
    } else if (entry.name.endsWith('.js')) {
      try {
        const cmd = require(fullPath);
        if (cmd?.data?.toJSON) {
          commands.push(cmd.data.toJSON());
          console.log(`  + ${cmd.data.name}`);
        }
      } catch (err) {
        console.error(`  ✗ Failed: ${fullPath} — ${err.message}`);
      }
    }
  }
}

console.log('Collecting commands...');
collectCommands(path.join(__dirname, 'commands'));
console.log(`\nFound ${commands.length} commands.\n`);

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      console.log(`Deploying to guild: ${guildId} (instant update)...`);
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
        { body: commands }
      );
      console.log('✅ Guild commands deployed successfully!');
    } else {
      console.log('Deploying globally (can take up to 1 hour)...');
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Global commands deployed successfully!');
    }
  } catch (err) {
    console.error('❌ Deployment failed:', err);
  }
})();
