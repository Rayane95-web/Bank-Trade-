const { Events } = require('discord.js');
const db = require('../utils/db');
const { addXp } = require('../utils/helpers');
const { trackQuest } = require('../utils/questTracker');
const config = require('../config/config');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;
    try {
      const user = db.getUser(message.author.id, message.guild.id, message.author.username);
      if (user.banned) return;

      const now       = Date.now();
      const xpCooldown = user.cooldowns.xp ? new Date(user.cooldowns.xp).getTime() + config.xp.cooldown : 0;
      if (now < xpCooldown) return;

      user.cooldowns.xp = new Date().toISOString();
      user.stats.messagesCount++;

      const xpAmount = Math.floor(Math.random() * (config.xp.perMessage.max - config.xp.perMessage.min + 1)) + config.xp.perMessage.min;
      const { leveledUp, newLevel } = addXp(user, xpAmount);
      trackQuest(user, 'chat');
      db.saveUser(user);

      if (leveledUp) {
        try { await message.channel.send({ content: `🎉 Congrats <@${message.author.id}>! You leveled up to **Level ${newLevel}**!` }); }
        catch (_) {}
      }
    } catch (_) {}
  },
};
