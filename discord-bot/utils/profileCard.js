const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { formatNumber } = require('./helpers');
const db = require('./db');

/**
 * Generates a 1200×600 profile card image as a Buffer.
 *
 * Layout (two-column):
 *  ┌─────────────────────────────────────────────────────────────────────────────┐
 *  │  [Avatar+glow]  Username  [Level badge]                                     │
 *  │                 ████████████░░░░  XP bar                                    │
 *  │                 Badges row                                                   │
 *  │─────────────────────────────────────────────────────────────────────────────│
 *  │  LEFT COLUMN (economy)          │  RIGHT COLUMN (activity & social)          │
 *  │  💰 Wallet   🏦 Bank            │  🎮 Games   🏆 Won   📊 Win Rate           │
 *  │  💎 Net Worth                   │  🔥 Streak  📅 Join  ⏱ Days Active        │
 *  │  📈 Total Earned                │  🎯 Fav Game  🏅 Rank  🧬 Mutations        │
 *  │  💸 Total Spent                 │  🎒 Items   🏆 Achievements                │
 *  └─────────────────────────────────────────────────────────────────────────────┘
 */
async function generateProfileCard(discordUser, userData, guildId) {
  const W = 1200, H = 600;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Background gradient ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#0d0d1a');
  bg.addColorStop(0.4, '#12122a');
  bg.addColorStop(1,   '#0a1628');
  ctx.fillStyle = bg;
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.fill();

  // ── Decorative background circles ─────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#9B59B6';
  ctx.beginPath(); ctx.arc(950, 100, 200, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5865F2';
  ctx.beginPath(); ctx.arc(1100, 500, 150, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9B59B6';
  ctx.beginPath(); ctx.arc(100, 500, 120, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ── Card border ────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(155,89,182,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, 1, 1, W - 2, H - 2, 24);
  ctx.stroke();

  // ── Left accent bar ────────────────────────────────────────────────────────
  const accentGrad = ctx.createLinearGradient(0, 0, 0, H);
  accentGrad.addColorStop(0, '#9B59B6');
  accentGrad.addColorStop(0.5, '#5865F2');
  accentGrad.addColorStop(1, '#9B59B6');
  ctx.fillStyle = accentGrad;
  ctx.beginPath();
  roundRect(ctx, 0, 0, 6, H, [24, 0, 0, 24]);
  ctx.fill();

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const avatarSize = 130;
  const avatarCX = 50 + avatarSize / 2;
  const avatarCY = 80 + avatarSize / 2;

  // Outer glow ring (animated-look gradient)
  const ringGrad = ctx.createLinearGradient(
    avatarCX - avatarSize / 2, avatarCY - avatarSize / 2,
    avatarCX + avatarSize / 2, avatarCY + avatarSize / 2
  );
  ringGrad.addColorStop(0, '#9B59B6');
  ringGrad.addColorStop(0.5, '#5865F2');
  ringGrad.addColorStop(1, '#9B59B6');

  ctx.save();
  ctx.shadowColor = '#9B59B6';
  ctx.shadowBlur = 28;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Avatar image clipped to circle
  try {
    const avatarUrl = discordUser.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarCX - avatarSize / 2, avatarCY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    ctx.fillStyle = '#9B59B6';
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Header: username + level badge ────────────────────────────────────────
  const headerX = 50 + avatarSize + 28;  // text starts after avatar

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px sans-serif';
  ctx.fillText(discordUser.username, headerX, 108);

  // Rank badge (server wealth rank)
  const rankText = userData.rank ? `#${userData.rank}` : '#—';
  const rankW = ctx.measureText(rankText).width + 20;
  ctx.fillStyle = 'rgba(88,101,242,0.55)';
  roundRect(ctx, headerX, 116, rankW, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#c9ceff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(rankText, headerX + 10, 134);

  // Level badge (top-right)
  const levelText = `✦ Level ${userData.level}`;
  ctx.font = 'bold 18px sans-serif';
  const lw = ctx.measureText(levelText).width + 28;
  const lx = W - lw - 28, ly = 28;
  ctx.fillStyle = 'rgba(155,89,182,0.65)';
  roundRect(ctx, lx, ly, lw, 36, 10);
  ctx.fill();
  ctx.fillStyle = '#e8d5ff';
  ctx.textAlign = 'center';
  ctx.fillText(levelText, lx + lw / 2, ly + 25);
  ctx.textAlign = 'left';

  // ── XP bar ─────────────────────────────────────────────────────────────────
  const xpNeeded = userData.level * 100;
  const xpPct    = Math.min((userData.xp || 0) / xpNeeded, 1);
  const barX = headerX, barY = 152, barW = W - headerX - 36, barH = 16;

  // Track
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, barX, barY, barW, barH, 8);
  ctx.fill();

  // Fill
  if (xpPct > 0) {
    const xpFill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    xpFill.addColorStop(0, '#9B59B6');
    xpFill.addColorStop(1, '#5865F2');
    ctx.fillStyle = xpFill;
    roundRect(ctx, barX, barY, Math.max(barW * xpPct, 16), barH, 8);
    ctx.fill();
  }

  // XP label
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '13px sans-serif';
  ctx.fillText(`${formatNumber(userData.xp || 0)} / ${formatNumber(xpNeeded)} XP`, barX, barY + barH + 18);

  // ── Badges / achievements row ──────────────────────────────────────────────
  const badgeY = barY + barH + 36;
  const badges = (userData.achievements || []).slice(0, 8);
  if (badges.length > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '12px sans-serif';
    ctx.fillText('ACHIEVEMENTS', barX, badgeY);
    badges.forEach((ach, i) => {
      const bx = barX + i * 110;
      ctx.fillStyle = 'rgba(155,89,182,0.3)';
      roundRect(ctx, bx, badgeY + 6, 100, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#e8d5ff';
      ctx.font = '12px sans-serif';
      const label = ach.name || ach;
      ctx.fillText(label.length > 12 ? label.slice(0, 11) + '…' : label, bx + 6, badgeY + 24);
    });
    if ((userData.achievements || []).length > 8) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '12px sans-serif';
      ctx.fillText(`+${userData.achievements.length - 8} more`, barX + 8 * 110, badgeY + 24);
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '13px sans-serif';
    ctx.fillText('No achievements yet — start playing to earn badges!', barX, badgeY + 20);
  }

  // ── Divider line ───────────────────────────────────────────────────────────
  const divY = 260;
  const divGrad = ctx.createLinearGradient(20, 0, W - 20, 0);
  divGrad.addColorStop(0,   'rgba(155,89,182,0)');
  divGrad.addColorStop(0.2, 'rgba(155,89,182,0.5)');
  divGrad.addColorStop(0.8, 'rgba(88,101,242,0.5)');
  divGrad.addColorStop(1,   'rgba(88,101,242,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(20, divY, W - 40, 1);

  // ── Column divider ─────────────────────────────────────────────────────────
  const colDivX = W / 2;
  const colDivGrad = ctx.createLinearGradient(0, divY + 10, 0, H - 20);
  colDivGrad.addColorStop(0,   'rgba(155,89,182,0.4)');
  colDivGrad.addColorStop(1,   'rgba(88,101,242,0.1)');
  ctx.fillStyle = colDivGrad;
  ctx.fillRect(colDivX, divY + 10, 1, H - divY - 30);

  // ── LEFT COLUMN: Economy stats ─────────────────────────────────────────────
  const leftX  = 28;
  const rightX = colDivX + 28;
  const statsStartY = divY + 30;
  const rowH = 72;

  // Section label
  drawSectionLabel(ctx, '💰 Economy', leftX, statsStartY);

  const netWorth = (userData.wallet || 0) + (userData.bank || 0);
  const leftStats = [
    [
      { label: '👛 Wallet',       value: formatNumber(userData.wallet || 0) },
      { label: '🏦 Bank',         value: formatNumber(userData.bank || 0) },
    ],
    [
      { label: '💎 Net Worth',    value: formatNumber(netWorth) },
      { label: '📈 Total Earned', value: formatNumber(userData.totalEarned || 0) },
    ],
    [
      { label: '💸 Total Spent',  value: formatNumber(userData.totalSpent || 0) },
      { label: '🏦 Bank Limit',   value: formatNumber(userData.bankLimit || 10000) },
    ],
  ];

  leftStats.forEach((row, ri) => {
    const y = statsStartY + 22 + ri * rowH;
    row.forEach((stat, ci) => {
      drawStatCell(ctx, stat.label, stat.value, leftX + ci * 270, y);
    });
  });

  // ── RIGHT COLUMN: Activity & social stats ─────────────────────────────────
  drawSectionLabel(ctx, '📊 Activity', rightX, statsStartY);

  const gamesPlayed = userData.stats?.gamesPlayed || 0;
  const gamesWon    = userData.stats?.gamesWon    || 0;
  const winRate     = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : '0.0';
  const streak      = userData.streak || userData.stats?.dailyStreak || 0;
  const joinDate    = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
  const playtime    = userData.playtime || 0;
  const favGame     = userData.favoriteGame
    ? userData.favoriteGame.charAt(0).toUpperCase() + userData.favoriteGame.slice(1)
    : 'None';
  const mutCount    = (userData.inventory || []).filter(i => i.mutationId).length;
  const itemCount   = (userData.inventory || []).filter(i => !i.mutationId).length;
  const achCount    = (userData.achievements || []).length;

  const rightStats = [
    [
      { label: '🎮 Games Played', value: `${gamesPlayed}` },
      { label: '🏆 Games Won',    value: `${gamesWon}` },
      { label: '📊 Win Rate',     value: `${winRate}%` },
    ],
    [
      { label: '🔥 Streak',       value: `${streak} days` },
      { label: '📅 Joined',       value: joinDate },
      { label: '⏱ Days Active',   value: `${playtime}` },
    ],
    [
      { label: '🎯 Fav Game',     value: favGame },
      { label: '🧬 Mutations',    value: `${mutCount}` },
      { label: '🎒 Items',        value: `${itemCount}` },
    ],
    [
      { label: '🏅 Achievements', value: `${achCount}` },
      { label: '🤝 Referrals',    value: `${(userData.referrals || []).length}` },
      { label: '📦 Investments',  value: `${(userData.investments || []).length}` },
    ],
  ];

  rightStats.forEach((row, ri) => {
    const y = statsStartY + 22 + ri * (rowH - 8);
    const colW = (W - rightX - 28) / row.length;
    row.forEach((stat, ci) => {
      drawStatCell(ctx, stat.label, stat.value, rightX + ci * colW, y);
    });
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '12px sans-serif';
  ctx.fillText(`${discordUser.username} • Economy Profile`, 28, H - 14);
  ctx.textAlign = 'right';
  ctx.fillText('Use /stats for full details', W - 28, H - 14);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Draw a small section label */
function drawSectionLabel(ctx, text, x, y) {
  ctx.fillStyle = 'rgba(155,89,182,0.8)';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(text.toUpperCase(), x, y + 14);
}

/** Draw a single stat cell with label + value */
function drawStatCell(ctx, label, value, x, y) {
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.font = '12px sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(value, x, y + 22);
}

function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  const [tl, tr, br, bl] = r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y,       x + w, y + tr,     tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h,   x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h,       x, y + h - bl,     bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y,           x + tl, y,         tl);
  ctx.closePath();
}

module.exports = { generateProfileCard };
