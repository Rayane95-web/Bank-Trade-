const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { formatNumber } = require('./helpers');
const db = require('./db');

/**
 * Generates a 1200×630 profile card image as a Buffer.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────────────────────┐
 *  │  [Avatar+glow]  Username  [Level badge]  [Rank badge]                    │
 *  │                 ████████████░░░░  XP bar  XP% label                      │
 *  │──────────────────────────────────────────────────────────────────────────│
 *  │  💰 ECONOMY (boxed)              │  📊 ACTIVITY (boxed)                  │
 *  │  Wallet / Bank / Net Worth       │  Games / Won / Win Rate               │
 *  │  Total Earned / Total Spent      │  Streak / Days Active / Join Date     │
 *  │──────────────────────────────────────────────────────────────────────────│
 *  │  ⭐ PROGRESS (boxed)             │  🎒 COLLECTION (boxed)                │
 *  │  Level / XP / XP%               │  Items / Mutations / Achievements      │
 *  └──────────────────────────────────────────────────────────────────────────┘
 */
async function generateProfileCard(discordUser, userData, guildId) {
  const W = 1200, H = 630;
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
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#9B59B6';
  ctx.beginPath(); ctx.arc(980, 90, 220, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5865F2';
  ctx.beginPath(); ctx.arc(1130, 540, 160, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9B59B6';
  ctx.beginPath(); ctx.arc(80, 540, 130, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ── Card border ────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(155,89,182,0.5)';
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
  const avatarSize = 120;
  const avatarCX = 56 + avatarSize / 2;
  const avatarCY = 56 + avatarSize / 2;

  // Outer glow ring
  const ringGrad = ctx.createLinearGradient(
    avatarCX - avatarSize / 2, avatarCY - avatarSize / 2,
    avatarCX + avatarSize / 2, avatarCY + avatarSize / 2
  );
  ringGrad.addColorStop(0, '#9B59B6');
  ringGrad.addColorStop(0.5, '#5865F2');
  ringGrad.addColorStop(1, '#9B59B6');

  ctx.save();
  ctx.shadowColor = '#9B59B6';
  ctx.shadowBlur = 30;
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

  // ── Header: username + badges ──────────────────────────────────────────────
  const headerX = 56 + avatarSize + 24;

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(discordUser.username, headerX, 90);

  // Rank badge
  const rankText = userData.rank ? `🏅 Rank #${userData.rank}` : '🏅 Rank #—';
  ctx.font = 'bold 14px sans-serif';
  const rankW = ctx.measureText(rankText).width + 22;
  ctx.fillStyle = 'rgba(88,101,242,0.7)';
  roundRect(ctx, headerX, 100, rankW, 28, 7);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(rankText, headerX + 11, 119);

  // Level badge (top-right corner)
  const levelText = `✦ Level ${userData.level}`;
  ctx.font = 'bold 20px sans-serif';
  const lw = ctx.measureText(levelText).width + 32;
  const lx = W - lw - 24, ly = 22;
  ctx.fillStyle = 'rgba(155,89,182,0.8)';
  roundRect(ctx, lx, ly, lw, 40, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(levelText, lx + lw / 2, ly + 28);
  ctx.textAlign = 'left';

  // ── XP bar ─────────────────────────────────────────────────────────────────
  const xpNeeded = userData.level * 100;
  const xpCurrent = userData.xp || 0;
  const xpPct    = Math.min(xpCurrent / xpNeeded, 1);
  const barX = headerX, barY = 138, barW = W - headerX - 36, barH = 18;

  // Track background
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRect(ctx, barX, barY, barW, barH, 9);
  ctx.fill();

  // Fill
  if (xpPct > 0) {
    const xpFill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    xpFill.addColorStop(0, '#9B59B6');
    xpFill.addColorStop(1, '#5865F2');
    ctx.fillStyle = xpFill;
    roundRect(ctx, barX, barY, Math.max(barW * xpPct, 18), barH, 9);
    ctx.fill();
  }

  // XP label — large and bright
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(
    `${formatNumber(xpCurrent)} / ${formatNumber(xpNeeded)} XP  (${(xpPct * 100).toFixed(1)}%)`,
    barX, barY + barH + 20
  );

  // ── Horizontal divider ─────────────────────────────────────────────────────
  const divY = 192;
  const divGrad = ctx.createLinearGradient(20, 0, W - 20, 0);
  divGrad.addColorStop(0,   'rgba(155,89,182,0)');
  divGrad.addColorStop(0.15,'rgba(155,89,182,0.6)');
  divGrad.addColorStop(0.85,'rgba(88,101,242,0.6)');
  divGrad.addColorStop(1,   'rgba(88,101,242,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(20, divY, W - 40, 2);

  // ── Stat section layout ────────────────────────────────────────────────────
  // Four boxes: top-left, top-right, bottom-left, bottom-right
  const PAD   = 18;   // padding inside boxes
  const GAP   = 14;   // gap between boxes
  const BOX_Y1 = divY + 14;
  const BOX_H  = 190;
  const BOX_Y2 = BOX_Y1 + BOX_H + GAP;
  const BOX_W  = (W - 28 - 28 - GAP) / 2;  // two columns
  const BOX_X1 = 20;
  const BOX_X2 = BOX_X1 + BOX_W + GAP;

  // ── Compute all stats ──────────────────────────────────────────────────────
  const netWorth    = (userData.wallet || 0) + (userData.bank || 0);
  const gamesPlayed = userData.stats?.gamesPlayed || 0;
  const gamesWon    = userData.stats?.gamesWon    || 0;
  const winRate     = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : '0.0';
  const streak      = userData.streak || userData.stats?.dailyStreak || 0;
  const joinDate    = userData.createdAt
    ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';
  const daysActive  = userData.playtime || 0;
  const mutCount    = (userData.inventory || []).filter(i => i.mutationId).length;
  const itemCount   = (userData.inventory || []).filter(i => !i.mutationId).length;
  const achCount    = (userData.achievements || []).length;

  // ── BOX 1 (top-left): 💰 Economy ──────────────────────────────────────────
  drawBox(ctx, BOX_X1, BOX_Y1, BOX_W, BOX_H);
  drawBoxTitle(ctx, '💰 Economy', BOX_X1 + PAD, BOX_Y1 + PAD + 16);

  const econStats = [
    { label: 'Wallet',       value: `💛 ${formatNumber(userData.wallet || 0)}` },
    { label: 'Bank',         value: `🏦 ${formatNumber(userData.bank || 0)}` },
    { label: 'Net Worth',    value: `💎 ${formatNumber(netWorth)}` },
    { label: 'Total Earned', value: `📈 ${formatNumber(userData.totalEarned || 0)}` },
    { label: 'Total Spent',  value: `💸 ${formatNumber(userData.totalSpent || 0)}` },
  ];
  drawStatGrid(ctx, econStats, BOX_X1 + PAD, BOX_Y1 + PAD + 30, BOX_W - PAD * 2, BOX_H - PAD * 2 - 30);

  // ── BOX 2 (top-right): 📊 Activity ────────────────────────────────────────
  drawBox(ctx, BOX_X2, BOX_Y1, BOX_W, BOX_H);
  drawBoxTitle(ctx, '📊 Activity', BOX_X2 + PAD, BOX_Y1 + PAD + 16);

  const actStats = [
    { label: 'Games Played', value: `🎮 ${gamesPlayed}` },
    { label: 'Games Won',    value: `🏆 ${gamesWon}` },
    { label: 'Win Rate',     value: `📊 ${winRate}%` },
    { label: 'Daily Streak', value: `🔥 ${streak} days` },
    { label: 'Days Active',  value: `⏱ ${daysActive}` },
  ];
  drawStatGrid(ctx, actStats, BOX_X2 + PAD, BOX_Y1 + PAD + 30, BOX_W - PAD * 2, BOX_H - PAD * 2 - 30);

  // ── BOX 3 (bottom-left): ⭐ Progress ──────────────────────────────────────
  drawBox(ctx, BOX_X1, BOX_Y2, BOX_W, BOX_H);
  drawBoxTitle(ctx, '⭐ Progress', BOX_X1 + PAD, BOX_Y2 + PAD + 16);

  const xpPctStr = `${(xpPct * 100).toFixed(1)}%`;
  const progStats = [
    { label: 'Level',        value: `✦ ${userData.level}` },
    { label: 'Current XP',   value: `⚡ ${formatNumber(xpCurrent)}` },
    { label: 'XP Needed',    value: `🎯 ${formatNumber(xpNeeded)}` },
    { label: 'XP Progress',  value: `📶 ${xpPctStr}` },
    { label: 'Join Date',    value: `📅 ${joinDate}` },
  ];
  drawStatGrid(ctx, progStats, BOX_X1 + PAD, BOX_Y2 + PAD + 30, BOX_W - PAD * 2, BOX_H - PAD * 2 - 30);

  // ── BOX 4 (bottom-right): 🎒 Collection ───────────────────────────────────
  drawBox(ctx, BOX_X2, BOX_Y2, BOX_W, BOX_H);
  drawBoxTitle(ctx, '🎒 Collection', BOX_X2 + PAD, BOX_Y2 + PAD + 16);

  const colStats = [
    { label: 'Items Owned',   value: `🎒 ${itemCount}` },
    { label: 'Mutations',     value: `🧬 ${mutCount}` },
    { label: 'Achievements',  value: `🏅 ${achCount}` },
    { label: 'Referrals',     value: `🤝 ${(userData.referrals || []).length}` },
    { label: 'Investments',   value: `📦 ${(userData.investments || []).length}` },
  ];
  drawStatGrid(ctx, colStats, BOX_X2 + PAD, BOX_Y2 + PAD + 30, BOX_W - PAD * 2, BOX_H - PAD * 2 - 30);

  // ── Footer ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '13px sans-serif';
  ctx.fillText(`${discordUser.username} • Economy Profile`, 28, H - 12);
  ctx.textAlign = 'right';
  ctx.fillText('Use /stats for full details', W - 28, H - 12);
  ctx.textAlign = 'left';

  return canvas.toBuffer('image/png');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Draw a semi-transparent frosted box for a stat section.
 */
function drawBox(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(155,89,182,0.35)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a bold section title inside a box.
 */
function drawBoxTitle(ctx, text, x, y) {
  ctx.fillStyle = '#c9b8ff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(text, x, y);
}

/**
 * Draw a grid of label/value pairs inside a box.
 * Stats are laid out in two columns.
 */
function drawStatGrid(ctx, stats, x, y, w, h) {
  const cols = 2;
  const colW = w / cols;
  const rowH = Math.min(h / Math.ceil(stats.length / cols), 46);

  stats.forEach((stat, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sx  = x + col * colW;
    const sy  = y + row * rowH;

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '12px sans-serif';
    ctx.fillText(stat.label, sx, sy + 14);

    // Value — large, white, bold
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(stat.value, sx, sy + 34);
  });
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
