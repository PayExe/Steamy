const { PermissionFlagsBits } = require('discord.js');
const db = require('../db');

async function set(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ content: '❌ Tu dois avoir la permission **Gérer les salons** pour utiliser cette commande.', ephemeral: true });
  }

  const channel = interaction.options.getChannel('salon');

  if (!channel) {
    await db.clearChannels(interaction.guild.id);
    return interaction.reply({ content: '🔓 Restrictions retirées, commandes dispo partout.' });
  }

  const added = await db.toggleChannel(interaction.guild.id, channel.id);
  if (added) {
    await interaction.reply({ content: `✅ <#${channel.id}> ajouté aux salons autorisés.` });
  } else {
    await interaction.reply({ content: `🗑️ <#${channel.id}> retiré des salons autorisés.` });
  }
}

module.exports = { set };
