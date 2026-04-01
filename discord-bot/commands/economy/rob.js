const { SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');
const { successEmbed, errorEmbed, cooldownEmbed } = require('../../utils/embeds');
const { formatNumber, checkCooldown, setCooldown, chance, random } = require('../../utils/helpers');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob').setDescription('Attempt to rob another user')
    .addUserOption(o => o.setName('user').setDescription('User to rob').setRequired(true)),
  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user');
      if (target.id === interaction.user.id) return interaction.reply({ embeds: [errorEmbed("You can't rob yourself.")], ephemeral: true });
      if (target.bot) return interaction.reply({ embeds: [errorEmbed("You can't rob a bot.")], ephemeral: true });

      const robber = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const victim = db.getUser(target.id, interaction.guildId, target.username);
      if (robber.banned) return interaction.reply({ embeds: [errorEmbed('You are banned from the economy.')], ephemeral: true });

      const remaining = checkCooldown(robber, 'rob');
      if (remaining > 0) return interaction.reply({ embeds: [cooldownEmbed(remaining)], ephemeral: true });
      if (victim.wallet < 100) return interaction.reply({ embeds: [errorEmbed(`<@${target.id}> doesn't have enough coins to rob (min 100).`)], ephemeral: true });

      setCooldown(robber, 'rob');

      if (db.hasActiveItem(victim, 'shield')) {
        db.saveUser(robber);
        return interaction.reply({ embeds: [errorEmbed(`<@${target.id}> has a 🛡️ **Rob Shield**! Your attempt failed.`)] });
      }

      if (chance(config.economy.robSuccessChance * 100)) {
        const stolen = random(Math.floor(victim.wallet * 0.1), Math.floor(victim.wallet * 0.3));
        robber.wallet      += stolen;
        robber.totalEarned += stolen;
        victim.wallet      -= stolen;
        db.saveUser(robber); db.saveUser(victim);
        return interaction.reply({ embeds: [successEmbed('Robbery Successful! 🦹', `You robbed <@${target.id}> and stole **${formatNumber(stolen)}** coins!`, [
          { name: '👛 Your Wallet', value: `\`${formatNumber(robber.wallet)}\``, inline: true },
        ])] });
      } else {
        const fine = random(50, 200);
        robber.wallet = Math.max(0, robber.wallet - fine);
        db.saveUser(robber);
        return interaction.reply({ embeds: [errorEmbed(`You got caught! You paid a fine of **${formatNumber(fine)}** coins. 🚔`)] });
      }
    } catch (err) { console.error(err); return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true }); }
  },
};
