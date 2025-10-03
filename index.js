require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, InteractionType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { searchSteamAppId } = require('./utils/searchSteamAppId');

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!token) {
  console.warn('⚠️ Aucun token Discord détecté. Assure-toi d\'avoir défini DISCORD_TOKEN (ou TOKEN) dans ton fichier .env.');
}

/* <!--> PARAMÈTRES BOT <--> */
const ALLOW_DLC = true;
const MAX_GAME_NAME_LENGTH = 100;

/* <!--> CACHE STEAM <--> */
let steamAppListCache = null;
let steamAppListCacheTime = 0;
const STEAM_CACHE_DURATION = 1000 * 60 * 60;

/* <!--> ANTI-SPAM <--> */
const cooldowns = new Map();
const COOLDOWN_TIME = 3000;

/* Utility: truncates and formats text as a blockquote (adds leading '> ' per line) */
function formatAsBlockquote(text, maxLen = 600) {
  if (!text) return "";
  let t = String(text).replace(/\r\n?/g, '\n');
  if (t.length > maxLen) {
    t = t.slice(0, maxLen) + '...';
  }
  // Use native Markdown blockquote '>' so Discord renders the grey bar on the left.
  return '> ' + t.split('\n').join('\n> ');
}

/* <!--> CHARGEMENT LISTE STEAM <--> */
async function getSteamAppList() {
  const now = Date.now();
  if (steamAppListCache && (now - steamAppListCacheTime < STEAM_CACHE_DURATION)) {
    return steamAppListCache;
  }
  const res = await fetch('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
  const data = await res.json();
  steamAppListCache = data.applist.apps;
  steamAppListCacheTime = now;
  return steamAppListCache;
}

/* <!--> INFO JEU STEAM <--> */
async function getSteamAppDetails(appid) {
  try {
    const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=fr`);
    const json = await res.json();
    return json[appid];
  } catch (e) {
    return null;
  }
}

function isNSFWSteamGame(data) {
  /* <!--> NSFW JEUX <--> */
  const nsfwKeywords = [
    "Sexual Content", "Nudity", "NSFW", "Hentai", "Mature", "Adult Only"
  ];
  const genres = (data.genres || []).map(g => g.description || "").join(" ").toLowerCase();
  const categories = (data.categories || []).map(c => c.description || "").join(" ").toLowerCase();
  return nsfwKeywords.some(keyword =>
    genres.includes(keyword.toLowerCase()) || categories.includes(keyword.toLowerCase())
  );
}

(async () => {
  const adapter = new JSONFile('db.json');
  const db = new Low(adapter, { wishlists: {} });
  await db.read();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.once('ready', () => {
    console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
  });

  client.on('guildCreate', async (guild) => {
  /* <!--> SALON D'ACCUEIL <--> */
    const channel = guild.systemChannel || guild.channels.cache.find(
      ch => ch.type === 0 && ch.permissionsFor(guild.members.me).has('SendMessages')
    );
    if (channel) {
      channel.send(
        "👋 Merci de m'avoir ajouté sur ce serveur !\n" +
        "Utilise `/help` pour voir toutes mes commandes Steam."
      ).catch(() => { });
    }
  });

  client.on('interactionCreate', async interaction => {
    try {
  /* <!--> AUTOCOMPLÉTION <--> */
      if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        const focused = interaction.options.getFocused();
        const subcommand = interaction.commandName;

  /* <!--> AUTOCOMP REMOVEWISHLIST <--> */
        if (subcommand === 'removewishlist') {
          await db.read();
          const games = db.data.wishlists[interaction.user.id] || [];
          const filtered = games
            .filter(game => game.name.toLowerCase().startsWith(focused.toLowerCase()))
            .slice(0, 25);

          return await interaction.respond(
            filtered.map(game => ({ name: game.name, value: game.name }))
          );
        }

  /* <!--> AUTOCOMP STEAM <--> */
        if (subcommand === 'addwishlist' || subcommand === 'library-steam' || subcommand === 'random-steam') {
          const apps = await getSteamAppList();
          let filtered = apps
            .filter(app =>
              app.name &&
              app.name.length > 0 &&
              app.name.length <= 100 &&
              app.name.toLowerCase().includes(focused.toLowerCase())
            );

          filtered = [
            ...filtered.filter(app => app.name.toLowerCase() === focused.toLowerCase()),
            ...filtered.filter(app => app.name.toLowerCase().startsWith(focused.toLowerCase()) && app.name.toLowerCase() !== focused.toLowerCase()),
            ...filtered.filter(app => !app.name.toLowerCase().startsWith(focused.toLowerCase()) && app.name.toLowerCase().includes(focused.toLowerCase()))
          ];

          const seen = new Set();
          filtered = filtered.filter(app => {
            if (seen.has(app.name)) return false;
            seen.add(app.name);
            return true;
          }).slice(0, 20);

          return await interaction.respond(
            filtered.map(app => ({ name: app.name, value: app.name }))
          );
        }
      }

  /* <!--> PAGINATION <--> */
      if (interaction.isButton()) {
        const [type, direction, userId, page] = interaction.customId.split('_');
        if (type === 'wishlist' && (direction === 'prev' || direction === 'next')) {
          await db.read();
          const list = db.data.wishlists[userId] || [];
          const pageSize = 10;
          const maxPage = Math.ceil(list.length / pageSize);
          const currentPage = Math.max(1, Math.min(Number(page), maxPage));
          const start = (currentPage - 1) * pageSize;
          const end = start + pageSize;

          const embed = new EmbedBuilder()
            .setTitle(`🎮・Wishlist de ${String(interaction.user.username).toUpperCase()} (page ${currentPage}/${maxPage})`)
            .setColor(0x0099ff)
            .setTimestamp();

          let thumbnailSet = false;
          // Build a single description with blockquote lines so Discord shows a grey bar on the left
          const descLines = [];
          let idx = start + 1;
          for (const game of list.slice(start, end)) {
            let star = '';
            try {
              const info = await getSteamAppDetails(game.appid);
              if (info && info.success && info.data.price_overview) {
                const price = info.data.price_overview;
                if (price.initial > price.final) {
                  star = '⭐️';
                }
              }
              descLines.push(`**${idx}. ${star} ${game.name}**`);
              descLines.push(formatAsBlockquote(`[Voir sur Steam](https://store.steampowered.com/app/${game.appid})`));
              if (!thumbnailSet && info && info.success && info.data.header_image) {
                embed.setThumbnail(info.data.header_image);
                thumbnailSet = true;
              }
            } catch (e) {
              descLines.push(`**${idx}. ${game.name}**`);
              descLines.push(formatAsBlockquote(`[Voir sur Steam](https://store.steampowered.com/app/${game.appid})`));
            }
            idx++;
          }

          if (descLines.length > 0) {
            embed.setDescription(descLines.join('\n'));
          }

          const row = new ActionRowBuilder();
          if (maxPage > 1) {
            if (currentPage > 1) {
              row.addComponents(
                new ButtonBuilder()
                  .setCustomId(`wishlist_prev_${userId}_${currentPage - 1}`)
                  .setLabel('⬅️ Précédent')
                  .setStyle(ButtonStyle.Primary)
              );
            }
            if (currentPage < maxPage) {
              row.addComponents(
                new ButtonBuilder()
                  .setCustomId(`wishlist_next_${userId}_${currentPage + 1}`)
                  .setLabel('Suivant ➡️')
                  .setStyle(ButtonStyle.Primary)
              );
            }
          }

          await interaction.update({
            embeds: [embed],
            components: maxPage > 1 ? [row] : []
          });
        }
      }

  /* <!--> COMMANDES SLASH <--> */
      if (!interaction.isChatInputCommand()) return;

  /* <!--> LOGS <--> */
      console.log(`[${new Date().toLocaleString()}] ${interaction.user.tag} (${interaction.user.id}) a utilisé /${interaction.commandName} sur ${interaction.guild ? interaction.guild.name : "DM"}`);

  /* <!--> COOLDOWN <--> */
      const userId = interaction.user.id;
      const now = Date.now();
      if (!cooldowns.has(userId)) cooldowns.set(userId, 0);
      if (now - cooldowns.get(userId) < COOLDOWN_TIME) {
        return await interaction.reply({ content: "⏳ Merci de patienter un peu avant de réutiliser une commande.", ephemeral: true });
      }
      cooldowns.set(userId, now);

      const { commandName, options, user } = interaction;

  /* <!--> ADDWISHLIST <--> */
      if (commandName === 'addwishlist') {
        const gameName = options.getString('jeu');
        if (!gameName || gameName.length === 0 || gameName.length > MAX_GAME_NAME_LENGTH) {
          return await interaction.reply({ content: `❌ Le nom du jeu doit contenir entre 1 et ${MAX_GAME_NAME_LENGTH} caractères.` });
        }
        const appid = await searchSteamAppId(gameName);

        if (!appid) return await interaction.reply({ content: "❌ Jeu introuvable." });

  /* <!--> TYPE CHECK <--> */
        const info = await getSteamAppDetails(appid);
        if (
          !info || !info.success || !info.data ||
          (info.data.type !== 'game' && (!ALLOW_DLC || info.data.type !== 'dlc'))
        ) {
          return await interaction.reply({ content: "❌ Seuls les jeux Steam" + (ALLOW_DLC ? " et DLC " : " ") + "sont acceptés ou Steam ne répond pas." });
        }

        await db.read();
        db.data.wishlists[userId] ||= [];

        const alreadyExists = db.data.wishlists[userId].some(g => g.appid === appid);
        if (alreadyExists) return await interaction.reply({ content: "⚠️ Ce jeu est déjà dans ta wishlist." });

        db.data.wishlists[userId].push({ name: gameName, appid });
        await db.write();

        return await interaction.reply({ content: `✅ **${gameName}** a été ajouté à ta wishlist.` });
      }

  /* <!--> REMOVEWISHLIST <--> */
      if (commandName === 'removewishlist') {
        const gameName = options.getString('jeu');
        if (!gameName || gameName.length === 0 || gameName.length > MAX_GAME_NAME_LENGTH) {
          return await interaction.reply({ content: `❌ Le nom du jeu doit contenir entre 1 et ${MAX_GAME_NAME_LENGTH} caractères.` });
        }
        await db.read();
        const userList = db.data.wishlists[userId] || [];
        const index = userList.findIndex(game => game.name.toLowerCase() === gameName.toLowerCase());
        if (index === -1) return await interaction.reply({ content: "❌ Ce jeu n'est pas dans ta wishlist." });

        const removed = userList.splice(index, 1)[0];
        await db.write();

        return await interaction.reply({ content: `🗑️ **${removed.name}** a été retiré de ta wishlist.` });
      }

  /* <!--> CLEARWISHLIST <--> */
      if (commandName === 'clearwishlist') {
        await db.read();
        db.data.wishlists[userId] = [];
        await db.write();
        return await interaction.reply({ content: "🧹 Ta wishlist a été vidée." });
      }

  /* <!--> SHOWWISHLIST <--> */
      if (commandName === 'showwishlist') {
        const targetUser = options.getUser('utilisateur') || user;
        await db.read();
        const list = db.data.wishlists[targetUser.id] || [];

        if (list.length === 0) return await interaction.reply({ content: `📭 La wishlist de ${targetUser.username} est vide.` });

        const page = options.getInteger('page') || 1;
        const pageSize = 10;
        const maxPage = Math.ceil(list.length / pageSize);
        const currentPage = Math.max(1, Math.min(page, maxPage));
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;

        const embed = new EmbedBuilder()
          .setTitle(`🎮・Wishlist de ${String(targetUser.username).toUpperCase()} (page ${currentPage}/${maxPage})`)
          .setColor(0x0099ff)
          .setTimestamp();

        let thumbnailSet = false;
        const descLines = [];
        let idx = start + 1;
        for (const game of list.slice(start, end)) {
          let star = '';
          try {
            const info = await getSteamAppDetails(game.appid);
            if (info && info.success && info.data.price_overview) {
              const price = info.data.price_overview;
              if (price.initial > price.final) {
                star = '⭐️';
              }
            }
            descLines.push(`**${idx}. ${star} ${game.name}**`);
            descLines.push(formatAsBlockquote(`[Voir sur Steam](https://store.steampowered.com/app/${game.appid})`));
            if (!thumbnailSet && info && info.success && info.data.header_image) {
              embed.setThumbnail(info.data.header_image);
              thumbnailSet = true;
            }
          } catch (e) {
            descLines.push(`**${idx}. ${game.name}**`);
            descLines.push(formatAsBlockquote(`[Voir sur Steam](https://store.steampowered.com/app/${game.appid})`));
          }
          idx++;
        }

        if (descLines.length > 0) {
          embed.setDescription(descLines.join('\n'));
        }

        const row = new ActionRowBuilder();
        if (maxPage > 1) {
          if (currentPage > 1) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`wishlist_prev_${targetUser.id}_${currentPage - 1}`)
                .setLabel('⬅️ Précédent')
                .setStyle(ButtonStyle.Primary)
            );
          }
          if (currentPage < maxPage) {
            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`wishlist_next_${targetUser.id}_${currentPage + 1}`)
                .setLabel('Suivant ➡️')
                .setStyle(ButtonStyle.Primary)
            );
          }
        }

        await interaction.reply({
          embeds: [embed],
          components: maxPage > 1 ? [row] : []
        });
      }

  /* <!--> RANDOM-STEAM <--> */
      if (commandName === 'random-steam') {
        const apps = await getSteamAppList();
        let tries = 0;
        let found = null;
        while (tries < 20 && !found) {
          const randomApp = apps[Math.floor(Math.random() * apps.length)];
          const info = await getSteamAppDetails(randomApp.appid);
          if (info && info.success && info.data && info.data.type === 'game') {
            found = info.data;
            found.appid = randomApp.appid;
          }
          tries++;
        }
        if (!found) return await interaction.reply({ content: "❌ Impossible de trouver un jeu aléatoire pour le moment." });

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'Steam', iconURL: 'attachment://STEAM.png' })
          .setTitle(`**${String(found.name).toUpperCase()}**`)
          .setURL(`https://store.steampowered.com/app/${found.appid}`)
          // Use setDescription so the description sits directly under the title
          .setDescription(formatAsBlockquote(found.short_description || "*Pas de description.*"))
          .setImage(found.header_image)
          .setColor(0x1b2838)
          .setTimestamp();

        await interaction.reply({ embeds: [embed], files: [{ attachment: 'STEAM.png', name: 'STEAM.png' }] });
      }

  /* <!--> HELP <--> */
      if (commandName === 'help') {
        const embed = new EmbedBuilder()
          .setTitle("📖 Aide - Commandes disponibles")
          .setDescription("Voici les commandes que tu peux utiliser :")
          .addFields(
            { name: "/addwishlist [jeu]", value: "Ajoute un jeu à ta wishlist." },
            { name: "/removewishlist [jeu]", value: "Supprime un jeu de ta wishlist." },
            { name: "/showwishlist [@utilisateur] [page]", value: "Affiche la wishlist (avec pagination)." },
            { name: "/clearwishlist", value: "Vide ta wishlist." },
            { name: "/random-steam", value: "Propose un jeu Steam aléatoire." },
            { name: "/help", value: "Affiche cette aide." }
          )
          .setColor(0x7289DA)
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

  /* <!--> LIBRARY-STEAM <--> */
      if (commandName === 'library-steam') {
        const gameName = options.getString('jeu');
        if (!gameName || gameName.length === 0 || gameName.length > MAX_GAME_NAME_LENGTH) {
          return await interaction.reply({ content: `❌ Le nom du jeu doit contenir entre 1 et ${MAX_GAME_NAME_LENGTH} caractères.` });
        }
        const appid = await searchSteamAppId(gameName);

        if (!appid) return await interaction.reply({ content: "❌ Jeu introuvable." });

        const info = await getSteamAppDetails(appid);
        if (!info || !info.success || !info.data) {
          return await interaction.reply({ content: "❌ Impossible de récupérer les infos du jeu." });
        }

        const data = info.data;

  /* <!--> EMOJIS TYPE <--> */
        const typeEmojis = {
          game: "🎮・",
          dlc: "🧩・",
          demo: "🆓・",
          mod: "🛠️・",
          episode: "📺・",
          unknown: "❓・"
        };
        const typeEmoji = typeEmojis[data.type] || typeEmojis.unknown;

  /* <!--> PRIX <--> */
        let price = "Non disponible";
        if (data.price_overview) {
          price = data.price_overview.final === 0
            ? "🆓 Gratuit"
            : `💶 ${(data.price_overview.final / 100).toFixed(2)} €`;
          if (data.price_overview.discount_percent > 0) {
            price += `  🔥 **-${data.price_overview.discount_percent}%**`;
          }
        }

        // Indicate if the game/DLC is currently on sale: show a star and the discount percent next to the title
        const isOnSale = data.price_overview && data.price_overview.discount_percent > 0;
        const saleTag = isOnSale ? ` ⭐️ -${data.price_overview.discount_percent}%` : '';

  /* <!--> EVALUATIONS STEAM <--> */
        let review = "Non évalué";
        let reviewEmoji = "❔";
        if (data.supported_languages && data.steam_appid) {
          /* <!--> FETCH AVIS STEAM <--> */
          try {
            const res = await fetch(`https://store.steampowered.com/appreviews/${data.steam_appid}?json=1&language=all`);
            const reviewData = await res.json();
            if (reviewData && reviewData.query_summary) {
              const summary = reviewData.query_summary.review_score_desc || "";
              /* <!--> MAPPING EMOJIS <--> */
              if (summary.includes("Overwhelmingly Positive") || summary.includes("Extrêmement positif")) { reviewEmoji = "🌟"; }
              else if (summary.includes("Very Positive") || summary.includes("Très positif")) { reviewEmoji = "👍"; }
              else if (summary.includes("Positive") || summary.includes("Plutôt positif")) { reviewEmoji = "🙂"; }
              else if (summary.includes("Mixed") || summary.includes("Mitigées")) { reviewEmoji = "😐"; }
              else if (summary.includes("Negative") || summary.includes("Négatif")) { reviewEmoji = "👎"; }
              else if (summary.includes("Overwhelmingly Negative") || summary.includes("Extrêmement négatif")) { reviewEmoji = "💩"; }
              review = summary.length > 0 ? summary : review;
              /* <!--> AJOUT NOMBRE D'AVIS <--> */
              if (reviewData.query_summary.total_reviews) {
                review += ` (${reviewData.query_summary.total_reviews} avis)`;
              }
            }
          } catch (e) {
            /* <!--> IGNORE ERREUR API <--> */
          }
        }

  /* <!--> TRAILER VIDEO <--> */
        let trailerUrl = null;
        if (data.movies && data.movies.length > 0) {
          trailerUrl = data.movies[0].webm?.max
            || data.movies[0].mp4?.max
            || (data.movies[0].webm && data.movies[0].webm['480'])
            || (data.movies[0].mp4 && data.movies[0].mp4['480']);
        }

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'Steam', iconURL: 'attachment://STEAM.png' })
          // append sale tag (star + percent) to the title when discounted
          .setTitle(`**${typeEmoji} ${String(data.name).toUpperCase()}${saleTag}**`)
          .setURL(`https://store.steampowered.com/app/${appid}`)
          // Use setDescription so there's no blank line between title and description
          .setDescription(formatAsBlockquote(data.short_description || "*Pas de description.*"))
          .addFields(
            // spacer to create one blank line between description and the inline fields
            { name: '\u200b', value: '\u200b', inline: false },
            { name: "Prix", value: price, inline: true },
            { name: "Évaluations Steam", value: `${reviewEmoji} ${review}`, inline: true },
            { name: "Date de sortie", value: data.release_date?.date || "Inconnue", inline: true }
          )
          .setColor(0x1b2838)
          .setTimestamp();

        if (data.header_image) {
          // Utiliser une image d'embed plus grande pour une meilleure visibilité
          embed.setImage(data.header_image);
        }

  /* <!--> AJOUT TRAILER <--> */
        if (trailerUrl) {
          // spacer non-inline to separate from the inline fields above
          embed.addFields({ name: '\u200b', value: '\u200b', inline: false });
          // create a centered row by using three inline fields: spacer, trailer, spacer
          embed.addFields(
            { name: '\u200b', value: '\u200b', inline: true },
            // restore labelled link like before
            { name: '🎬・Trailer・🎬', value: `[Voir le trailer](${trailerUrl})`, inline: true },
            { name: '\u200b', value: '\u200b', inline: true }
          );
        }

        await interaction.reply({ embeds: [embed], files: [{ attachment: 'STEAM.png', name: 'STEAM.png' }] });
      }
    } catch (err) {
      console.error(`[${new Date().toLocaleString()}] Erreur pour ${interaction.user?.tag || "?"} (${interaction.user?.id || "?"}) :`, err);
      if (interaction.isRepliable && interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: "❌ Une erreur inattendue est survenue." });
        } else {
          await interaction.reply({ content: "❌ Une erreur inattendue est survenue." });
        }
      }
    }
  });

  client.login(token);
})();

