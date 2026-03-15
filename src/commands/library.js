const { EmbedBuilder } = require('discord.js');
const steam = require('../steam');
const { bq, validateGameName } = require('../utils');
const { EMOJIS, COLORS, TYPE_EMOJI, REVIEW_EMOJI, STEAM_URLS } = require('../constants');

function formatPrice(data) {
  const po = data.price_overview;
  if (po) {
    if (po.final === 0) return 'Gratuit';
    let s = `${EMOJIS.MONEY} ${(po.final / 100).toFixed(2)} €`;
    if (po.discount_percent > 0) s += `  ${EMOJIS.FIRE} **-${po.discount_percent}%**`;
    return s;
  }
  return data.is_free ? 'Gratuit' : 'Non disponible';
}

function getReviewEmoji(reviewScore) {
  if (!reviewScore) return EMOJIS.QUESTION;
  
  for (const [key, emoji] of Object.entries(REVIEW_EMOJI)) {
    if (reviewScore.includes(key)) return emoji;
  }
  
  return EMOJIS.QUESTION;
}

async function handle(interaction) {
  const gameName = interaction.options.getString('jeu');
  
  const validation = validateGameName(gameName);
  if (validation !== true) {
    return interaction.reply({ content: validation, ephemeral: true });
  }

  const appid = await steam.searchAppId(gameName);
  if (!appid) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Jeu introuvable.`,
      ephemeral: true 
    });
  }

  const info = await steam.getAppDetails(appid);
  if (!info?.success) {
    return interaction.reply({ 
      content: `${EMOJIS.ERROR} Impossible de récupérer les infos du jeu.`,
      ephemeral: true 
    });
  }

  const data = info.data;
  const price = formatPrice(data);

  let reviewText = 'Non évalué';
  let reviewIcon = EMOJIS.QUESTION;
  const rev = await steam.getReviews(data.steam_appid);
  if (rev?.review_score_desc) {
    reviewIcon = getReviewEmoji(rev.review_score_desc);
    reviewText = rev.review_score_desc;
    if (rev.total_reviews) reviewText += ` (${rev.total_reviews} avis)`;
  }

  const sale = data.price_overview?.discount_percent > 0;
  const tag = sale ? ` ${EMOJIS.STAR} -${data.price_overview.discount_percent}%` : '';
  const typeEmoji = TYPE_EMOJI[data.type] || EMOJIS.QUESTION;

  let trailer = null;
  if (data.movies?.length) {
    const m = data.movies[0];
    trailer = m.webm?.max || m.mp4?.max || m.webm?.['480'] || m.mp4?.['480'];
  }

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Steam', iconURL: 'attachment://STEAM.png' })
    .setTitle(`**${typeEmoji} ${data.name.toUpperCase()}${tag}**`)
    .setURL(`${STEAM_URLS.STORE_APP}${appid}`)
    .setDescription(bq(data.short_description || '*Pas de description.*'))
    .addFields(
      { name: '\u200b', value: '\u200b', inline: false },
      { name: 'Prix', value: price, inline: true },
      { name: 'Évaluations', value: `${reviewIcon} ${reviewText}`, inline: true },
      { name: 'Sortie', value: data.release_date?.date || 'Inconnue', inline: true },
    )
    .setColor(COLORS.STEAM)
    .setTimestamp();

  if (data.header_image) embed.setImage(data.header_image);

  if (trailer) {
    embed.addFields(
      { name: '\u200b', value: '\u200b', inline: false },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: `${EMOJIS.FILM} Trailer`, value: `[Voir le trailer](${trailer})`, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
    );
  }

  await interaction.reply({ 
    embeds: [embed], 
    files: [{ attachment: 'assets/STEAM.png', name: 'STEAM.png' }] 
  });
}

async function autocomplete(interaction) {
  const choices = await steam.autocomplete(interaction.options.getFocused());
  await interaction.respond(choices);
}

module.exports = { handle, autocomplete };
