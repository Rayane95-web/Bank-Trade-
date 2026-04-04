const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../utils/db');
const { errorEmbed } = require('../../utils/embeds');
const { MUTATIONS, TIER_COLORS } = require('../../utils/mutations');
const config = require('../../config/config');

const PAGE_SIZE = 10;

// Hex colours per tier for embed accent
const TIER_HEX = {
  Common:    0xaaaaaa,
  Uncommon:  0x57F287,
  Rare:      0x3498DB,
  Epic:      0x9B59B6,
  Legendary: 0xF1C40F,
  Mythic:    0xFF73FA,
  SECRET:    0xFFD700,
};

// Sort order for tiers (lowest → highest)
const TIER_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'SECRET'];

function buildPage(mutations, page, totalPages, ownedIds) {
  const start = page * PAGE_SIZE;
  const slice = mutations.slice(start, start + PAGE_SIZE);

  const lines = slice.map((m, i) => {
    const tierIcon  = TIER_COLORS[m.tier] || '⬜';
    const owned     = ownedIds.has(m.id) ? ' ✅' : '';
    const ability   = m.ability ? `\n    ╰ **Ability:** \`${m.ability}\`` : '';
    const duration  = m.duration
      ? `  ⏱ ${formatDuration(m.duration)}`
      : m.duration === null && m.ability ? '  ⏱ Permanent' : '';
    return (
      `**${start + i + 1}.** ${tierIcon} **${m.name}**${owned}  —  *${m.tier}*\n` +
      `    ${m.desc}${duration}${ability}`
    );
  });

  // Pick embed colour from the highest tier visible on this page
  const highestTier = slice.reduce((best, m) => {
    return TIER_ORDER.indexOf(m.tier) > TIER_ORDER.indexOf(best) ? m.tier : best;
  }, 'Common');

  return new EmbedBuilder()
    .setColor(TIER_HEX[highestTier] || config.colors.purple)
    .setTitle('🧬 Mutation Catalogue')
    .setDescription(lines.join('\n\n') || 'No mutations on this page.')
    .addFields(
      { name: '📖 Tier Guide', value: Object.entries(TIER_COLORS).map(([t, i]) => `${i} ${t}`).join('  '), inline: false },
    )
    .setFooter({ text: `Page ${page + 1} / ${totalPages}  •  ✅ = you own it  •  Total: ${mutations.length} mutations` })
    .setTimestamp();
}

function buildRow(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mut_prev')
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId('mut_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  );
}

function formatDuration(ms) {
  if (!ms) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d`;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mutations')
    .setDescription('Browse all mutations — IDs, tiers, descriptions, and abilities')
    .addStringOption(o =>
      o.setName('tier')
        .setDescription('Filter by tier')
        .setRequired(false)
        .addChoices(
          { name: '⬜ Common',    value: 'Common'    },
          { name: '🟩 Uncommon',  value: 'Uncommon'  },
          { name: '🟦 Rare',      value: 'Rare'      },
          { name: '🟪 Epic',      value: 'Epic'      },
          { name: '🟨 Legendary', value: 'Legendary' },
          { name: '🌈 Mythic',    value: 'Mythic'    },
          { name: '🔱 SECRET',    value: 'SECRET'    },
        )
    )
    .addBooleanOption(o =>
      o.setName('owned')
        .setDescription('Show only mutations you own')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const user      = db.getUser(interaction.user.id, interaction.guildId, interaction.user.username);
      const tierFilter = interaction.options.getString('tier');
      const ownedOnly  = interaction.options.getBoolean('owned') ?? false;

      // Build set of owned mutation IDs
      const ownedIds = new Set(
        (user.inventory || [])
          .filter(i => i.mutationId)
          .map(i => i.mutationId)
      );

      // Sort mutations: tier order (rarest last), then alphabetically
      let mutations = [...MUTATIONS].sort((a, b) => {
        const ta = TIER_ORDER.indexOf(a.tier);
        const tb = TIER_ORDER.indexOf(b.tier);
        if (ta !== tb) return ta - tb;
        return a.name.localeCompare(b.name);
      });

      if (tierFilter) {
        mutations = mutations.filter(m => m.tier === tierFilter);
      }
      if (ownedOnly) {
        mutations = mutations.filter(m => ownedIds.has(m.id));
      }

      if (mutations.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error)
              .setTitle('🧬 No Mutations Found')
              .setDescription(
                ownedOnly
                  ? "You don't own any mutations yet! Buy a **Mystery Cart** or **Lucky Block** from the shop."
                  : `No mutations found for tier **${tierFilter}**.`
              )
              .setTimestamp(),
          ],
        });
      }

      let page = 0;
      const totalPages = Math.ceil(mutations.length / PAGE_SIZE);

      const msg = await interaction.editReply({
        embeds:     [buildPage(mutations, page, totalPages, ownedIds)],
        components: totalPages > 1 ? [buildRow(page, totalPages)] : [],
      });

      if (totalPages <= 1) return;

      const collector = msg.createMessageComponentCollector({
        filter: btn => btn.user.id === interaction.user.id,
        time:   120_000,
      });

      collector.on('collect', async btn => {
        await btn.deferUpdate();
        if (btn.customId === 'mut_prev' && page > 0) page--;
        if (btn.customId === 'mut_next' && page < totalPages - 1) page++;
        await btn.editReply({
          embeds:     [buildPage(mutations, page, totalPages, ownedIds)],
          components: [buildRow(page, totalPages)],
        });
      });

      collector.on('end', () => {
        msg.edit({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error(err);
      const reply = { embeds: [errorEmbed('Something went wrong.')], ephemeral: true };
      return interaction.deferred ? interaction.editReply(reply) : interaction.reply(reply);
    }
  },
};
