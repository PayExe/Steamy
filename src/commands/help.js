const { EmbedBuilder } = require('discord.js');
const { EMOJIS, COLORS } = require('../constants');

async function handle(interaction) {
  const embed = new EmbedBuilder()
    .setTitle(`${EMOJIS.GUIDE} Aide`)
    .addFields(
      {
        name: '/addwishlist [jeu]',
        value: 'Ajoute un jeu à ta wishlist et active les alertes de prix (DM).',
        inline: false,
      },
      {
        name: '/removewishlist [jeu]',
        value: 'Retire un jeu de ta wishlist.',
        inline: false,
      },
      {
        name: '/showwishlist [@user] [page]',
        value: 'Affiche une wishlist.',
        inline: false,
      },
      {
        name: '/clearwishlist',
        value: 'Vide ta wishlist.',
        inline: false,
      },
      {
        name: '/library-steam [jeu]',
        value: 'Infos détaillées sur un jeu.',
        inline: false,
      },
      {
        name: '/random-steam',
        value: 'Un jeu au hasard.',
        inline: false,
      },
      {
        name: '/setchannel [salon]',
        value: 'Ajoute/retire un salon autorisé (mods). Sans argument = reset.',
        inline: false,
      },
      {
        name: '/adminalerts add/remove/list [jeu]',
        value: 'Gère les alertes serveur (admin seulement).',
        inline: false,
      },
      {
        name: '/dailyalert [salon]',
        value: 'Active/désactive les alertes quotidiennes à 20h dans un salon (admin).',
        inline: false,
      },
      {
        name: '/notifconfig [heure] [frequence]',
        value: 'Configure quand recevoir les alertes (0-23h, 1-7 jours).',
        inline: false,
      },
    )
    .setColor(COLORS.DISCORD)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

module.exports = { handle };
