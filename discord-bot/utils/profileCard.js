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
 *  │  Total Earned / Total Spent      │  Streak / Days Active                 │
 *  │──────────────────────────────────────────────────────────────────────────│
 *  │  ⭐ PROGRESS (boxed)             │  🎒 COLLECTION (boxed)                │
 *  │  Level / XP / XP%               │  Items / Mutations / Achievements      │
 *  └──────────────────────────────────────────────────────────────────────────┘
 */
async function generateProfileCard(discordUser, userData, guildId) {
  const W = 1200, H = 630;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Reset context to a known clean state ───────────────────────────────────
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

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
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#9B59B6';
  ctx.beginPath(); ctx.arc(980, 90, 220, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5865F2';
  ctx.beginPath(); ctx.arc(1130, 540, 160, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#9B59B6';
  ctx.beginPath(); ctx.arc(80, 540, 130, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ── Card border ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(155,89,182,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, 1, 1, W - 2, H - 2, 24);
  ctx.stroke();
  ctx.restore();

  // ── Left accent bar ────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  const accentGrad = ctx.createLinearGradient(0, 0, 0, H);
  accentGrad.addColorStop(0, '#9B59B6');
  accentGrad.addColorStop(0.5, '#5865F2');
  accentGrad.addColorStop(1, '#9B59B6');
  ctx.fillStyle = accentGrad;
  ctx.beginPath();
  roundRect(ctx, 0, 0, 6, H, [24, 0, 0, 24]);
  ctx.fill();
  ctx.restore();

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const avatarSize = 120;
  const avatarCX = 56 + avatarSize / 2;
  const avatarCY = 56 + avatarSize / 2;

  // Outer glow ring
  ctx.save();
  ctx.globalAlpha = 1;
  const ringGrad = ctx.createLinearGradient(
    avatarCX - avatarSize / 2, avatarCY - avatarSize / 2,
    avatarCX + avatarSize / 2, avatarCY + avatarSize / 2
  );
  ringGrad.addColorStop(0, '#9B59B6');
  ringGrad.addColorStop(0.5, '#5865F2');
  ringGrad.addColorStop(1, '#9B59B6');
  ctx.shadowColor = '#9B59B6';
  ctx.shadowBlur = 20;
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
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarCX - avatarSize / 2, avatarCY - avatarSize / 2, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#9B59B6';
    ctx.beginPath();
    ctx.arc(avatarCX, avatarCY, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Header: username + badges ──────────────────────────────────────────────
  const headerX = 56 + avatarSize + 24;

  // Username — solid white, no shadow
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(discordUser.username, headerX, 90);
  ctx.restore();

  // Rank badge background
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  const rankText = userData.rank ? `Rank #${userData.rank}` : 'Rank #—';
  ctx.font = 'bold 14px sans-serif';
  const rankW = ctx.measureText(rankText).width + 28;
  ctx.fillStyle = 'rgba(88,101,242,0.85)';
  roundRect(ctx, headerX, 100, rankW, 28, 7);
  ctx.fill();
  ctx.restore();

  // Rank badge text — solid white
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(rankText, headerX + 14, 119);
  ctx.restore();

  // Level badge background (top-right corner)
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  const levelText = `Level ${userData.level}`;
  ctx.font = 'bold 20px sans-serif';
  const lw = ctx.measureText(levelText).width + 36;
  const lx = W - lw - 24, ly = 22;
  ctx.fillStyle = 'rgba(155,89,182,0.9)';
  roundRect(ctx, lx, ly, lw, 40, 10);
  ctx.fill();
  ctx.restore();

  // Level badge text — solid white, centered
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(levelText, lx + lw / 2, ly + 28);
  ctx.restore();

  // ── XP bar ─────────────────────────────────────────────────────────────────
  const xpNeeded  = userData.level * 100;
  const xpCurrent = userData.xp || 0;
  const xpPct     = Math.min(xpCurrent / xpNeeded, 1);
  const barX = headerX, barY = 138, barW = W - headerX - 36, barH = 18;

  // Track background
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, barX, barY, barW, barH, 9);
  ctx.fill();
  ctx.restore();

  // Fill
  if (xpPct > 0) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    const xpFill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    xpFill.addColorStop(0, '#9B59B6');
    xpFill.addColorStop(1, '#5865F2');
    ctx.fillStyle = xpFill;
    roundRect(ctx, barX, barY, Math.max(barW * xpPct, 18), barH, 9);
    ctx.fill();
    ctx.restore();
  }

  // XP label — solid white, no transparency
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    `${formatNumber(xpCurrent)} / ${formatNumber(xpNeeded)} XP  (${(xpPct * 100).toFixed(1)}%)`,
    barX, barY + barH + 20
  );
  ctx.restore();

  // ── Horizontal divider ─────────────────────────────────────────────────────
  const divY = 192;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  const divGrad = ctx.createLinearGradient(20, 0, W - 20, 0);
  divGrad.addColorStop(0,    'rgba(155,89,182,0)');
  divGrad.addColorStop(0.15, 'rgba(155,89,182,0.6)');
  divGrad.addColorStop(0.85, 'rgba(88,101,242,0.6)');
  divGrad.addColorStop(1,    'rgba(88,101,242,0)');
  ctx.fillStyle = divGrad;
  ctx.fillRect(20, divY, W - 40, 2);
  ctx.restore();

  // ── Stat section layout ────────────────────────────────────────────────────
  const PAD    = 18;
  const GAP    = 14;
  const BOX_Y1 = divY + 14;
  const BOX_H  = 190;
  const BOX_Y2 = BOX_Y1 + BOX_H + GAP;
  const BOX_W  = (W - 28 - 28 - GAP) / 2;
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
    { label: 'Wallet',       value: formatNumber(userData.wallet || 0) },
    { label: 'Bank',         value: formatNumber(userData.bank || 0) },
    { label: 'Net Worth',    value: formatNumber(netWorth) },
    { label: 'Total Earned', value: formatNumber(userData.totalEarned || 0) },
    { label: 'Total Spent',  value: formatNumber(userData.totalSpent || 0) },
  ];
  drawStatGrid(ctx, econStats, BOX_X1 + PAD, BOX_Y1 + PAD + 30, BOX_W - PAD * 2, BOX_H - PAD * 2 - 30);

  // ── BOX 2 (top-right): 📊 Activity ────────────────────────────────────────
  drawBox(ctx, BOX_X2, BOX_Y1, BOX_W, BOX_H);
  drawBoxTitle(ctx, '📊 Activity', BOX_X2 + PAD, BOX_Y1 + PAD + 16);

  const actStats = [
    { label: 'Games Played', value: String(gamesPlayed) },
    { label: 'Games Won',    value: String(gamesWon) },
    { label: 'Win Rate',     value: `${winRate}%` },
    { label: 'Daily Streak', value: `${streak} days` },
    { label: 'Days Active',  value: String(daysActive) },
  ];
  drawStatGrid(ctx, actStats, BOX_X2 + PAD, BOX_Y1 + PAD + 30, BOX_W - PAD * 2, BOX_H - PAD * 2 - 30);

  // ── BOX 3 (bottom-left): ⭐ Progress ──────────────────────────────────────
  drawBox(ctx, BOX_X1, BOX_Y2, BOX_W, BOX_H);
  drawBoxTitle(ctx, '⭐ Progress', BOX_X1 + PAD, BOX_Y2 + PAD + 16);

  const xpPctStr = `${(xpPct * 100).toFixed(1)}%`;
  const progStats = [
    { label: 'Level',       value: String(userData.level) },
    { label: 'Current XP',  value: formatNumber(xpCurrent) },
    { label: 'XP Needed',   value: formatNumber(xpNeeded) },
    { label: 'XP Progress', value: xpPctStr },
    { label: 'Join Date',   value: joinDate },
  ];
  drawStatGrid(ctx, progStats, BOX_X1 + PAD, BOX_Y2 + PAD + 30, BOX_W - PAD * 2, BOX_H - PAD * 2 - 30);

  // ── BOX 4 (bottom-right): 🎒 Collection ───────────────────────────────────
  drawBox(ctx, BOX_X2, BOX_Y2, BOX_W, BOX_H);
  drawBoxTitle(ctx, '🎒 Collection', BOX_X2 + PAD, BOX_Y2 + PAD + 16);

  const colStats = [
    { label: 'Items Owned',  value: String(itemCount) },
    { label: 'Mutations',    value: String(mutCount) },
    { label: 'Achievements', value: String(achCount) },
    { label: 'Referrals',    value: String((userData.referrals || []).length) },
    { label: 'Investments',  value: String((userData.investments || []).length) },
  ];
  drawStatGrid(ctx, colStats, BOX_X2 + PAD, BOX_Y2 + PAD + 30, BOX_W - PAD * 2, BOX_H - PAD * 2 - 30);

  // ── Footer ─────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${discordUser.username} • Economy Profile`, 28, H - 12);
  ctx.textAlign = 'right';
  ctx.fillText('Use /stats for full details', W - 28, H - 12);
  ctx.restore();

  return canvas.toBuffer('image/png');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Draw a semi-transparent box for a stat section.
 * Uses ctx.save()/restore() to avoid leaking state.
 */
function drawBox(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  // Darker background for better text contrast
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(155,89,182,0.6)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a bold section title inside a box.
 * Uses ctx.save()/restore() to avoid leaking state.
 */
function drawBoxTitle(ctx, text, x, y) {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d4b8ff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Draw a grid of label/value pairs inside a box.
 * Stats are laid out in two columns.
 * Uses ctx.save()/restore() to avoid leaking state.
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

    // Label — solid light grey, fully opaque
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#b0b8d0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stat.label, sx, sy + 14);
    ctx.restore();

    // Value — solid white, bold, larger font
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(stat.value, sx, sy + 34);
    ctx.restore();
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
