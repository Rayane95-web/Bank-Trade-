/**
 * db.js — Simple JSON file database
 * Replaces MongoDB entirely. Zero setup required.
 *
 * Data is stored in data/users.json
 * All reads/writes are synchronous in memory; file is flushed after every save.
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

// ── In-memory store ──────────────────────────────────────────────────────────
let store = {};

// ── Bootstrap ────────────────────────────────────────────────────────────────
function init() {
  if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}', 'utf8');
  try {
    store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    store = {};
  }
  console.log('✅ JSON database loaded');
}

// ── Persist ───────────────────────────────────────────────────────────────────
function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

// ── Default user template ────────────────────────────────────────────────────
function defaultUser(userId, guildId, username) {
  return {
    userId,
    guildId,
    username: username || 'Unknown',

    wallet:     100,
    bank:       0,
    bankLimit:  10000,
    totalEarned: 0,

    xp:      0,
    level:   1,
    totalXp: 0,

    inventory: [],
    badges:    [],
    quests:    [],

    cooldowns: {
      daily:  null,
      work:   null,
      crime:  null,
      rob:    null,
      xp:     null,
    },

    stats: {
      gamesPlayed:   0,
      gamesWon:      0,
      totalGambled:  0,
      totalWon:      0,
      messagesCount: 0,
      commandsUsed:  0,
      dailyStreak:   0,
    },

    banned:    false,
    banReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── Key helper ────────────────────────────────────────────────────────────────
function key(userId, guildId) {
  return `${guildId}:${userId}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Get or create a user object. Always returns a live reference. */
function getUser(userId, guildId, username) {
  const k = key(userId, guildId);
  if (!store[k]) {
    store[k] = defaultUser(userId, guildId, username);
  } else if (username && store[k].username !== username) {
    store[k].username = username;
  }
  return store[k];
}

/** Persist a user object back to disk. */
function saveUser(user) {
  user.updatedAt = new Date().toISOString();
  const k = key(user.userId, user.guildId);
  store[k] = user;
  save();
}

/** Delete a user (reset). */
function deleteUser(userId, guildId) {
  const k = key(userId, guildId);
  delete store[k];
  save();
}

/** Get all users for a guild, sorted by a field. */
function getLeaderboard(guildId, sortFn, limit = 10) {
  return Object.values(store)
    .filter(u => u.guildId === guildId && !u.banned)
    .sort(sortFn)
    .slice(0, limit);
}

// ── Item helpers (replicate Mongoose virtuals) ───────────────────────────────

function hasActiveItem(user, itemId) {
  const item = (user.inventory || []).find(i => i.itemId === itemId);
  if (!item) return false;
  if (item.expiresAt && new Date(item.expiresAt) < new Date()) return false;
  return true;
}

function xpForNextLevel(user) {
  return user.level * 100;
}

module.exports = { init, getUser, saveUser, deleteUser, getLeaderboard, hasActiveItem, xpForNextLevel, save };
