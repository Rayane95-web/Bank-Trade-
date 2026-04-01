const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config/config');

const TYPE_EMOJI  = { boost: '⚡', protection: '🛡️', permanent: '♾️', flex: '💅', gacha: '🎲' };
const TYPE_LABEL  = { boost: 'Boost', protection: 'Protection', permanent: 'Permanent', flex: 'Prestige Flex', gacha: 'Gacha / RNG' };
const CATEGORIES  = ['boost', 'protection', 'permanent', 'flex', 'gacha'];
const CAT_NAMES   = { boost: '⚡ Boosts', protection: '🛡️ Protection', permanent: '♾️ Permanent', flex: '💅 Prestige', gacha: '🎲 Gacha' };

function durLabel(ms) {
  if (!ms) return '♾️ Permanent';
  const h = ms / 3600000;
  return `⏳ ${h >= 1 ? h + 'h' : ms / 60000 + 'm'}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop').setDescription('Browse the item shop by category'),

  async execute(interaction) {
    const buildEmbed = (cat) => {
      const items = config.shop.filter(i => i.type === cat);
      const embed = new EmbedBuilder()
        .setColor(config.colors.gold)
        .setTitle(`🛒 Shop — ${CAT_NAMES[cat]}`)
        .setDescription(`Use \`/buy <item_id>\` to purchase.\n\u200B`)
        .setFooter({ text: 'Use the dropdown to switch categories' })
        .setTimestamp();

      for (const item of items) {
        embed.addFields({
          name:  `${item.name}  •  💰 ${item.price.toLocaleString()} coins`,
          value: [`📝 ${item.description}`, `🏷️ **${TYPE_LABEL[item.type]}** ${TYPE_EMOJI[item.type]}  |  ${durLabel(item.duration)}`, `🆔 \`${item.id}\``].join('\n'),
          inline: false,
        });
      }
      return embed;
    };

    const menu = new StringSelectMenuBuilder()
      .setCustomId('shop_cat')
      .setPlaceholder('📂 Select category…')
      .addOptions(CATEGORIES.map(c => ({ label: CAT_NAMES[c].replace(/^.{2}/, '').trim(), value: c, emoji: CAT_NAMES[c][0] })));

    const row   = new ActionRowBuilder().addComponents(menu);
    const reply = await interaction.reply({ embeds: [buildEmbed('boost')], components: [row], fetchReply: true });

    const col = reply.createMessageComponentCollector({ time: 90000 });
    col.on('collect', async sel => { await sel.deferUpdate(); await sel.editReply({ embeds: [buildEmbed(sel.values[0])], components: [row] }); });
    col.on('end', () => reply.edit({ components: [] }).catch(() => {}));
  },
};
