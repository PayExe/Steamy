const { EmbedBuilder } = require('discord.js');
const steam = require('../steam');
const { bq } = require('../utils');

const typeEmoji = { game: '🎮', dlc: '🧩', demo: '🆓', mod: '🛠️', episode: '📺' };

const reviewEmoji = {
  'Overwhelmingly Positive': '🌟', 'Very Positive': '👍',
  'Positive': '🙂', 'Mostly Positive': '🙂', 'Mixed': '😐',
  'Mostly Negative': '👎', 'Negative': '👎', 'Very Negative': '👎',
  'Overwhelmingly Negative': '💩',
};

function formatPrice(data) {
  const po = data.price_overview;
  if (po) {
    if (po.final === 0) return 'Gratuit';
    let s = `💶 ${(po.final / 100).toFixed(2)} €`;
    if (po.discount_percent > 0) s += `  🔥 **-${po.discount_percent}%**`;
    return s;
  }
  return data.is_free ? 'Gratuit' : 'Non disponible';
}

async function handle(interaction) {
  const gameName = interaction.options.getString('jeu');
  if (!gameName || gameName.length > 100) {
    return interaction.reply({ content: '❌ Nom invalide (1-100 chars).' });
  }

  const appid = await steam.searchAppId(gameName);
  if (!appid) return interaction.reply({ content: '❌ Jeu introuvable.' });

  const info = await steam.getAppDetails(appid);
  if (!info?.success) return interaction.reply({ content: '❌ Impossible de récupérer les infos.' });
  const data = info.data;
  const price = formatPrice(data);

  let reviewText = 'Non évalué';
  let reviewIcon = '❔';
  const rev = await steam.getReviews(data.steam_appid);
  if (rev?.review_score_desc) {
    const desc = rev.review_score_desc;
    reviewIcon = Object.entries(reviewEmoji).find(([k]) => desc.includes(k))?.[1] || '❔';
    reviewText = desc;
    if (rev.total_reviews) reviewText += ` (${rev.total_reviews} avis)`;
  }

  const sale = data.price_overview?.discount_percent > 0;
  const tag = sale ? ` ⭐️ -${data.price_overview.discount_percent}%` : '';

  let trailer = null;
  if (data.movies?.length) {
    const m = data.movies[0];
    trailer = m.webm?.max || m.mp4?.max || m.webm?.['480'] || m.mp4?.['480'];
  }

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Steam', iconURL: 'attachment://STEAM.png' })
    .setTitle(`**${(typeEmoji[data.type] || '❓')}・${data.name.toUpperCase()}${tag}**`)
    .setURL(`https://store.steampowered.com/app/${appid}`)
    .setDescription(bq(data.short_description || '*Pas de description.*'))
    .addFields(
      { name: '\u200b', value: '\u200b', inline: false },
      { name: 'Prix', value: price, inline: true },
      { name: 'Évaluations', value: `${reviewIcon} ${reviewText}`, inline: true },
      { name: 'Sortie', value: data.release_date?.date || 'Inconnue', inline: true },
    )
    .setColor(0x1b2838)
    .setTimestamp();

  if (data.header_image) embed.setImage(data.header_image);

  if (trailer) {
    embed.addFields(
      { name: '\u200b', value: '\u200b', inline: false },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: '🎬・Trailer', value: `[Voir le trailer](${trailer})`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    );
  }

  interaction.reply({ embeds: [embed], files: [{ attachment: 'STEAM.png', name: 'STEAM.png' }] });
}

async function autocomplete(interaction) {
  const choices = await steam.autocomplete(interaction.options.getFocused());
  interaction.respond(choices);
}

module.exports = { handle, autocomplete };
