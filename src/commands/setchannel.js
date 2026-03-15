const { PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { EMOJIS } = require('../constants');

async function set(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Tu dois avoir la permission **Gérer les salons** pour utiliser cette commande.`,
      ephemeral: true 
    });
  }

  const channel = interaction.options.getChannel('salon');

  if (!channel) {
    await db.clearChannels(interaction.guild.id);
    return interaction.reply({ 
      content: `${EMOJIS.LOCK_OPEN} Restrictions retirées, commandes dispo partout.`,
      ephemeral: true 
    });
  }

  const added = await db.toggleChannel(interaction.guild.id, channel.id);
  if (added) {
    await interaction.reply({ 
      content: `${EMOJIS.SUCCESS} <#${channel.id}> ajouté aux salons autorisés.`,
      ephemeral: true 
    });
  } else {
    await interaction.reply({ 
      content: `${EMOJIS.TRASH} <#${channel.id}> retiré des salons autorisés.`,
      ephemeral: true 
    });
  }
}

module.exports = { set };
