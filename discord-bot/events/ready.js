const { Events, ActivityType } = require('discord.js');
const db = require('../utils/db');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    db.init();
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guild(s)`);

    const activities = [
      { name: '/help | Economy Bot', type: ActivityType.Playing },
      { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: '/lucky_block | 0.01% Admin SK', type: ActivityType.Playing },
      { name: '/crash | Bet & cash out!', type: ActivityType.Playing },
    ];
    let i = 0;
    client.user.setActivity(activities[0].name, { type: activities[0].type });
    setInterval(() => {
      i = (i + 1) % activities.length;
      client.user.setActivity(activities[i].name, { type: activities[i].type });
    }, 30000);
  },
};
