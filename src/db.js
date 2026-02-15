const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const db = new Low(new JSONFile(path.join(__dirname, '..', 'db.json')), { wishlists: {}, channels: {} });

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

async function getAllowedChannels(guildId) {
  await db.read();
  return db.data.channels?.[guildId] || [];
}

async function toggleChannel(guildId, channelId) {
  await db.read();
  db.data.channels ||= {};
  const list = db.data.channels[guildId] ||= [];
  const i = list.indexOf(channelId);
  if (i === -1) {
    list.push(channelId);
    await db.write();
    return true;
  } else {
    list.splice(i, 1);
    if (!list.length) delete db.data.channels[guildId];
    await db.write();
    return false;
  }
}

async function clearChannels(guildId) {
  await db.read();
  db.data.channels ||= {};
  delete db.data.channels[guildId];
  await db.write();
}

module.exports = { init, getWishlist, addGame, removeGame, clearWishlist, getAllowedChannels, toggleChannel, clearChannels };
