const db = require('../db');

async function set(interaction) {
  const channel = interaction.options.getChannel('salon');

  if (!channel) {
    await db.clearChannels(interaction.guild.id);
    return interaction.reply({ content: '🔓 Restrictions retirées, commandes dispo partout.' });
  }

  const added = await db.toggleChannel(interaction.guild.id, channel.id);
  if (added) {
    interaction.reply({ content: `✅ <#${channel.id}> ajouté aux salons autorisés.` });
  } else {
    interaction.reply({ content: `🗑️ <#${channel.id}> retiré des salons autorisés.` });
  }
}

module.exports = { set };
