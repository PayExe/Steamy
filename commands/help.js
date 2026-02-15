const { EmbedBuilder } = require('discord.js');

function handle(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📖 Aide')
    .addFields(
      { name: '/addwishlist [jeu]', value: 'Ajoute un jeu à ta wishlist.' },
      { name: '/removewishlist [jeu]', value: 'Retire un jeu de ta wishlist.' },
      { name: '/showwishlist [@user] [page]', value: 'Affiche une wishlist.' },
      { name: '/clearwishlist', value: 'Vide ta wishlist.' },
      { name: '/library-steam [jeu]', value: 'Infos détaillées sur un jeu.' },
      { name: '/random-steam', value: 'Un jeu au hasard.' },
    )
    .setColor(0x7289DA)
    .setTimestamp();

  interaction.reply({ embeds: [embed] });
}

module.exports = { handle };
