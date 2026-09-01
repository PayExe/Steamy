const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const db = new Low(
  new JSONFile(path.join(__dirname, '..', 'db.json')), 
  { wishlists: {}, channels: {}, userAlerts: {}, adminAlerts: {}, dailyAlerts: {}, userNotificationConfig: {} }
);

const init = () => db.read();

async function getWishlist(userId) {
  await db.read();
  return db.data.wishlists[userId] || [];
}

async function addGame(userId, name, appid) {
  await db.read();
  const list = db.data.wishlists[userId] ||= [];
  
  if (list.some(g => g.appid === String(appid))) {
    return false;
  }
  
  list.push({ name, appid: String(appid) });
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
  const val = db.data.channels?.[guildId];
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
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

async function getUserAlerts(userId) {
  await db.read();
  return db.data.userAlerts[userId] || [];
}

async function saveUserAlerts(userId, alerts) {
  await db.read();
  db.data.userAlerts ||= {};
  db.data.userAlerts[userId] = alerts;
  await db.write();
}

async function getAdminAlerts(guildId) {
  await db.read();
  return db.data.adminAlerts[guildId] || [];
}

async function saveAdminAlerts(guildId, alerts) {
  await db.read();
  db.data.adminAlerts ||= {};
  db.data.adminAlerts[guildId] = alerts;
  await db.write();
}

async function getAllUserAlerts() {
  await db.read();
  return db.data.userAlerts || {};
}

async function getAllAdminAlerts() {
  await db.read();
  return db.data.adminAlerts || {};
}

async function getDailyAlertChannels(guildId) {
  await db.read();
  return db.data.dailyAlerts?.[guildId] || [];
}

async function setDailyAlertChannel(guildId, channelId) {
  await db.read();
  db.data.dailyAlerts ||= {};
  const channels = db.data.dailyAlerts[guildId] ||= [];
  
  const index = channels.indexOf(channelId);
  if (index === -1) {
    channels.push(channelId);
  } else {
    channels.splice(index, 1);
    if (!channels.length) delete db.data.dailyAlerts[guildId];
  }
  
  await db.write();
  return index === -1;
}

async function getAllDailyAlerts() {
  await db.read();
  return db.data.dailyAlerts || {};
}

async function getUserNotificationConfig(userId) {
  await db.read();
  return db.data.userNotificationConfig?.[userId] || { hour: 20, interval: 1 };
}

async function setUserNotificationConfig(userId, config) {
  await db.read();
  db.data.userNotificationConfig ||= {};
  db.data.userNotificationConfig[userId] = config;
  await db.write();
}

async function getAllUserNotificationConfigs() {
  await db.read();
  return db.data.userNotificationConfig || {};
}

module.exports = {
  init,
  getWishlist,
  addGame,
  removeGame,
  clearWishlist,
  getAllowedChannels,
  toggleChannel,
  clearChannels,
  getUserAlerts,
  saveUserAlerts,
  getAdminAlerts,
  saveAdminAlerts,
  getAllUserAlerts,
  getAllAdminAlerts,
  getDailyAlertChannels,
  setDailyAlertChannel,
  getAllDailyAlerts,
  getUserNotificationConfig,
  setUserNotificationConfig,
  getAllUserNotificationConfigs,
};
