const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { generateProfileCard } = require('../../utils/profileCard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile').setDescription("View a user's profile card")
    .addUserOption(o => o.setName('user').setDescription('User to view').setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const target = interaction.options.getUser('user') || interaction.user;
      const user   = db.getUser(target.id, interaction.guildId, target.username);
      const buffer = await generateProfileCard(target, user);
      return interaction.editReply({ files: [new AttachmentBuilder(buffer, { name: 'profile.png' })] });
    } catch (err) { console.error(err); return interaction.editReply({ embeds: [errorEmbed('Could not generate profile card.')] }); }
  },
};
