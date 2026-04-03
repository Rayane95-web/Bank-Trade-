const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { formatNumber, progressBar } = require('./helpers');

/**
 * Generates a 900×280 profile card image as a Buffer.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────────────────────┐
 *  │  [Avatar]  Username          Level 12                                    │
 *  │            ████████████░░░░  1200 / 1300 XP                             │
 *  │            💰 Wallet  🏦 Bank  💎 Net Worth                              │
 *  │            🎮 Games  🏆 Won   📈 Total Earned                            │
 *  └──────────────────────────────────────────────────────────────────────────┘
 */
async function generateProfileCard(discordUser, userData) {
  const W = 900, H = 280;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Background gradient ────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   '#1a1a2e');
  bg.addColorStop(0.5, '#16213e');
  bg.addColorStop(1,   '#0f3460');
  ctx.fillStyle = bg;
  ctx.beginPath();
  roundRect(ctx, 0, 0, W, H, 20);
  ctx.fill();

  // ── Subtle card border ─────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, 1, 1, W - 2, H - 2, 20);
  ctx.stroke();

  // ── Left accent bar ────────────────────────────────────────────────────────
  const accent = ctx.createLinearGradient(0, 0, 0, H);
  accent.addColorStop(0, '#9B59B6');
  accent.addColorStop(1, '#5865F2');
  ctx.fillStyle = accent;
  ctx.beginPath();
  roundRect(ctx, 0, 0, 6, H, [20, 0, 0, 20]);
  ctx.fill();

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const avatarSize = 120;
  const avatarX = 35, avatarY = (H - avatarSize) / 2;

  // Avatar glow ring
  ctx.save();
  ctx.shadowColor = '#9B59B6';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#9B59B6';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Clip to circle and draw avatar
  try {
    const avatarUrl = discordUser.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true });
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // Fallback: coloured circle
    ctx.fillStyle = '#9B59B6';
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Text area starts after avatar ─────────────────────────────────────────
  const tx = avatarX + avatarSize + 28;

  // Username
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(discordUser.username, tx, 62);

  // Level badge
  const levelText = `Level ${userData.level}`;
  const lw = ctx.measureText(levelText).width + 24;
  const lx = W - lw - 24, ly = 34;
  ctx.fillStyle = 'rgba(155,89,182,0.6)';
  roundRect(ctx, lx, ly, lw, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(levelText, lx + lw / 2, ly + 22);
  ctx.textAlign = 'left';

  // ── XP bar ─────────────────────────────────────────────────────────────────
  const xpNeeded = userData.level * 100;
  const xpPct = Math.min(userData.xp / xpNeeded, 1);
  const barX = tx, barY = 78, barW = W - tx - 30, barH = 14;

  // Track
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRect(ctx, barX, barY, barW, barH, 7);
  ctx.fill();

  // Fill
  if (xpPct > 0) {
    const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fill.addColorStop(0, '#9B59B6');
    fill.addColorStop(1, '#5865F2');
    ctx.fillStyle = fill;
    roundRect(ctx, barX, barY, barW * xpPct, barH, 7);
    ctx.fill();
  }

  // XP label
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '13px sans-serif';
  ctx.fillText(`${formatNumber(userData.xp)} / ${formatNumber(xpNeeded)} XP`, barX, barY + barH + 18);

  // ── Stats row 1: economy ───────────────────────────────────────────────────
  const stats1 = [
    { label: '👛 Wallet',      value: formatNumber(userData.wallet) },
    { label: '🏦 Bank',        value: formatNumber(userData.bank) },
    { label: '💎 Net Worth',   value: formatNumber(userData.wallet + userData.bank) },
  ];
  drawStatRow(ctx, stats1, tx, 140, barW);

  // ── Stats row 2: activity ──────────────────────────────────────────────────
  const stats2 = [
    { label: '🎮 Games',       value: `${userData.stats.gamesPlayed}` },
    { label: '🏆 Won',         value: `${userData.stats.gamesWon}` },
    { label: '📈 Total Earned',value: formatNumber(userData.totalEarned) },
  ];
  drawStatRow(ctx, stats2, tx, 210, barW);

  // ── Footer line ────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '12px sans-serif';
  ctx.fillText(`Member since ${new Date(userData.createdAt).toDateString()}`, tx, H - 14);

  return canvas.toBuffer('image/png');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function drawStatRow(ctx, stats, startX, y, totalWidth) {
  const colW = totalWidth / stats.length;
  stats.forEach((s, i) => {
    const x = startX + i * colW;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '13px sans-serif';
    ctx.fillText(s.label, x, y);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(s.value, x, y + 22);
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
