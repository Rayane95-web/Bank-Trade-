const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View your unlocked achievements and badges')
    .addUserOption(o => o.setName('user').setDescription('User to view (default: yourself)').setRequired(false)),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('user') || interaction.user;
      const user   = db.getUser(target.id, interaction.guildId, target.username);

      const unlocked = user.achievements || [];
      const unlockedIds = new Set(unlocked.map(a => a.id || a));

      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(`🏅 ${target.username}'s Achievements`)
        .setDescription(`**${unlocked.length}** / **${config.achievements.length}** achievements unlocked`)
        .setThumbnail(target.displayAvatarURL({ size: 128 }))
        .setTimestamp();

      // Unlocked achievements
      if (unlocked.length > 0) {
        const lines = unlocked.map(a => {
          const def = config.achievements.find(x => x.id === (a.id || a));
          const date = a.unlockedAt ? ` *(${new Date(a.unlockedAt).toLocaleDateString()})* ` : '';
          return `✅ **${a.name || (def?.name) || a}**${date}${def ? `\n  ↳ ${def.description}` : ''}`;
        });
        embed.addFields({ name: '✅ Unlocked', value: lines.join('\n').slice(0, 1024), inline: false });
      }

      // Locked achievements (show up to 8)
      const locked = config.achievements.filter(a => !unlockedIds.has(a.id)).slice(0, 8);
      if (locked.length > 0) {
        const lines = locked.map(a => `🔒 **${a.name}**\n  ↳ ${a.description}`);
        embed.addFields({ name: '🔒 Locked (preview)', value: lines.join('\n').slice(0, 1024), inline: false });
      }

      embed.setFooter({ text: 'Achievements are awarded automatically or by admins' });
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Something went wrong.')], ephemeral: true });
    }
  },
};
