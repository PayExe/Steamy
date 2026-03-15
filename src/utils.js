const { LIMITS, EMOJIS, COLORS } = require('./constants');

function blockquote(text, max = LIMITS.DESCRIPTION_LENGTH) {
  if (!text) return '';
  let t = String(text).replace(/\r\n?/g, '\n');
  if (t.length > max) t = t.slice(0, max) + '...';
  return '> ' + t.split('\n').join('\n> ');
}

function validateGameName(name) {
  if (!name || typeof name !== 'string') {
    return `${EMOJIS.ERROR} Nom invalide.`;
  }
  if (name.trim().length === 0) {
    return `${EMOJIS.ERROR} Le nom ne peut pas être vide.`;
  }
  if (name.length > LIMITS.NAME_LENGTH) {
    return `${EMOJIS.ERROR} Nom trop long (max ${LIMITS.NAME_LENGTH} caractères).`;
  }
  return true;
}

function createSuccessEmbed(title, description) {
  const { EmbedBuilder } = require('discord.js');
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(COLORS.PRIMARY)
    .setTimestamp();
}

function createErrorEmbed(message) {
  const { EmbedBuilder } = require('discord.js');
  return new EmbedBuilder()
    .setTitle(`${EMOJIS.ERROR} Erreur`)
    .setDescription(message)
    .setColor(COLORS.ERROR)
    .setTimestamp();
}

const bq = blockquote;

module.exports = {
  blockquote,
  bq,
  validateGameName,
  createSuccessEmbed,
  createErrorEmbed,
};
