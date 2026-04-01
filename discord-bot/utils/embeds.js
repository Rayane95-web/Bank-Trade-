const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

function successEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description)
    .setTimestamp();
  if (fields.length) embed.addFields(fields);
  return embed;
}

function errorEmbed(description) {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('❌ Error')
    .setDescription(description)
    .setTimestamp();
}

function infoEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
  if (fields.length) embed.addFields(fields);
  return embed;
}

function warningEmbed(description) {
  return new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle('⚠️ Warning')
    .setDescription(description)
    .setTimestamp();
}

function goldEmbed(title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setColor(config.colors.gold)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
  if (fields.length) embed.addFields(fields);
  return embed;
}

function cooldownEmbed(ms) {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${remaining}s` : `${seconds}s`;
  return errorEmbed(`⏳ You're on cooldown! Please wait **${timeStr}**.`);
}

module.exports = { successEmbed, errorEmbed, infoEmbed, warningEmbed, goldEmbed, cooldownEmbed };
