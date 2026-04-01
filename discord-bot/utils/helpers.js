const db     = require('./db');
const config = require('../config/config');

// ── Number formatting ─────────────────────────────────────────────────────────
const SUFFIXES = [
  { value: 1e30, symbol: 'No' },
  { value: 1e27, symbol: 'Oc' },
  { value: 1e24, symbol: 'Sp' },
  { value: 1e21, symbol: 'Sx' },
  { value: 1e18, symbol: 'Qt' },
  { value: 1e15, symbol: 'Qd' },
  { value: 1e12, symbol: 'T'  },
  { value: 1e9,  symbol: 'B'  },
  { value: 1e6,  symbol: 'M'  },
  { value: 1e3,  symbol: 'k'  },
];

function formatNumber(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0';
  const abs = Math.abs(n);
  for (const tier of SUFFIXES) {
    if (abs >= tier.value) {
      return parseFloat((n / tier.value).toFixed(2)).toString() + tier.symbol;
    }
  }
  return Math.floor(n).toLocaleString();
}

function formatMoney(amount) {
  return `💰 **${formatNumber(amount)}** coins`;
}

// ── RNG ───────────────────────────────────────────────────────────────────────
function random(min, max)         { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max)    { return Math.random() * (max - min) + min; }
function chance(percent)          { return Math.random() * 100 < percent; }

// ── Cooldowns ─────────────────────────────────────────────────────────────────
const COOLDOWN_DURATIONS = {
  daily: 86400000,
  work:  3600000,
  crime: 7200000,
  rob:   3600000,
};

function checkCooldown(user, type) {
  const cd = user.cooldowns[type];
  if (!cd) return 0;
  const remaining = new Date(cd).getTime() + (COOLDOWN_DURATIONS[type] || 0) - Date.now();
  return remaining > 0 ? remaining : 0;
}

function setCooldown(user, type) {
  user.cooldowns[type] = new Date().toISOString();
}

// ── XP ────────────────────────────────────────────────────────────────────────
function xpForLevel(level) {
  return level * config.xp.levelMultiplier;
}

function addXp(user, amount) {
  const hasBoost = db.hasActiveItem(user, 'xp_boost');
  const finalXp  = hasBoost ? amount * 2 : amount;

  user.xp      += finalXp;
  user.totalXp += finalXp;

  let leveledUp = false;
  let newLevel  = user.level;

  while (user.xp >= xpForLevel(user.level)) {
    user.xp -= xpForLevel(user.level);
    user.level++;
    leveledUp = true;
    newLevel  = user.level;
  }

  return { leveledUp, newLevel, xpGained: finalXp };
}

// ── Admin / log ───────────────────────────────────────────────────────────────
function logAdminAction(adminUser, action, targetUser, details, guildId) {
  // Simple console log — no DB required
  console.log(`[ADMIN] ${action} | by ${adminUser.username} | target ${targetUser?.username || 'N/A'} | ${JSON.stringify(details)}`);
}

async function sendLogEmbed(client, embed) {
  try {
    if (!config.logChannelId) return;
    const ch = await client.channels.fetch(config.logChannelId).catch(() => null);
    if (ch) await ch.send({ embeds: [embed] });
  } catch { /* silent */ }
}

function isDeveloper(userId) {
  return config.developerIds.includes(String(userId));
}

// ── Misc ──────────────────────────────────────────────────────────────────────
function progressBar(current, max, length = 10) {
  const filled = Math.round((current / max) * length);
  return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, length - filled));
}

module.exports = {
  formatMoney, formatNumber,
  random, randomFloat, chance,
  checkCooldown, setCooldown,
  xpForLevel, addXp,
  logAdminAction, sendLogEmbed,
  isDeveloper, progressBar,
};
