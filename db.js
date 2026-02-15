const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const db = new Low(new JSONFile('db.json'), { wishlists: {}, channels: {} });

const init = () => db.read();

async function getWishlist(userId) {
  await db.read();
  return db.data.wishlists[userId] || [];
}

async function addGame(userId, name, appid) {
  await db.read();
  const list = db.data.wishlists[userId] ||= [];
  if (list.some(g => g.appid === appid)) return false;
  list.push({ name, appid });
  await db.write();
  return true;
}

async function removeGame(userId, gameName) {
  await db.read();
  const list = db.data.wishlists[userId] || [];
  const i = list.findIndex(g => g.name.toLowerCase() === gameName.toLowerCase());
  if (i === -1) return null;
  const [removed] = list.splice(i, 1);
  await db.write();
  return removed;
}

async function clearWishlist(userId) {
  await db.read();
  db.data.wishlists[userId] = [];
  await db.write();
}

async function getLockedChannel(guildId) {
  await db.read();
  return db.data.channels?.[guildId] || null;
}

async function setLockedChannel(guildId, channelId) {
  await db.read();
  db.data.channels ||= {};
  if (channelId) {
    db.data.channels[guildId] = channelId;
  } else {
    delete db.data.channels[guildId];
  }
  await db.write();
}

module.exports = { init, getWishlist, addGame, removeGame, clearWishlist, getLockedChannel, setLockedChannel };
