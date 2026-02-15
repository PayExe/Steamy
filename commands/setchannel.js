const { PermissionFlagsBits } = require('discord.js');
const db = require('../db');

async function set(interaction) {
  const channel = interaction.options.getChannel('salon');

  if (channel) {
    await db.setLockedChannel(interaction.guild.id, channel.id);
    interaction.reply({ content: `🔒 Commandes restreintes à <#${channel.id}>.` });
  } else {
    await db.setLockedChannel(interaction.guild.id, null);
    interaction.reply({ content: '🔓 Restriction de salon retirée, commandes disponibles partout.' });
  }
}

module.exports = { set };
