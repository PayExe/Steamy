require('dotenv').config();
const { Client, GatewayIntentBits, InteractionType } = require('discord.js');
const db = require('./db');
const alerts = require('./alerts');
const wishlist = require('./commands/wishlist');
const library = require('./commands/library');
const random = require('./commands/random');
const help = require('./commands/help');
const setchannel = require('./commands/setchannel');
const adminalerts = require('./commands/adminalerts');
const dailyalert = require('./commands/dailyalert');
const notifconfig = require('./commands/notifconfig');
const { EMOJIS, COOLDOWN } = require('./constants');

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!token) console.warn(`${EMOJIS.WARNING} Token manquant, check ton .env`);

const cooldowns = new Map();

function logInteraction(interaction) {
  const timestamp = new Date().toLocaleString();
  const user = interaction.user.tag;
  const command = interaction.commandName;
  const guild = interaction.guild?.name || 'DM';
  console.log(`[${timestamp}] ${user} — /${command} (${guild})`);
}

function checkCooldown(userId) {
  const now = Date.now();
  const lastUsed = cooldowns.get(userId) || 0;
  const timeSinceLastUse = now - lastUsed;

  if (timeSinceLastUse < COOLDOWN.COMMAND) {
    return false;
  }

  cooldowns.set(userId, now);
  return true;
}

async function handleInteraction(interaction) {
  if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
    if (interaction.commandName === 'addwishlist' || interaction.commandName === 'removewishlist') {
      return wishlist.autocomplete(interaction);
    }
    if (interaction.commandName === 'library-steam') {
      return library.autocomplete(interaction);
    }
    if (interaction.commandName === 'adminalerts') {
      return adminalerts.autocomplete(interaction);
    }
    return;
  }

  if (interaction.isButton() && interaction.customId.startsWith('wishlist_')) {
    return wishlist.onButton(interaction);
  }

  if (!interaction.isChatInputCommand()) return;

  logInteraction(interaction);

  if (interaction.commandName === 'setchannel') {
    return setchannel.set(interaction);
  }

  if (interaction.guild) {
    const allowed = await db.getAllowedChannels(interaction.guild.id);
    if (allowed.length && !allowed.includes(interaction.channelId)) {
      const list = allowed.map(id => `<#${id}>`).join(', ');
      return interaction.reply({
        content: `${EMOJIS.ERROR} Commandes autorisées uniquement dans : ${list}`,
        ephemeral: true,
      });
    }
  }

  if (!checkCooldown(interaction.user.id)) {
    return interaction.reply({
      content: `${EMOJIS.LOADING} Attends un peu.`,
      ephemeral: true,
    });
  }

  switch (interaction.commandName) {
    case 'addwishlist':
      return wishlist.add(interaction);
    case 'removewishlist':
      return wishlist.remove(interaction);
    case 'showwishlist':
      return wishlist.show(interaction);
    case 'clearwishlist':
      return wishlist.clear(interaction);
    case 'library-steam':
      return library.handle(interaction);
    case 'random-steam':
      return random.handle(interaction);
    case 'help':
      return help.handle(interaction);
    case 'adminalerts':
      return adminalerts.execute(interaction);
    case 'dailyalert':
      return dailyalert.execute(interaction);
    case 'notifconfig':
      return notifconfig.execute(interaction);
    default:
      return interaction.reply({
        content: `${EMOJIS.QUESTION} Commande inconnue.`,
        ephemeral: true,
      });
  }
}

async function handleError(context, interaction, error) {
  const user = interaction?.user?.tag || 'inconnu';
  console.error(`${EMOJIS.ERROR} Erreur (${context}, utilisateur: ${user}):`, error);

  const msg = `${EMOJIS.ERROR} Erreur inattendue.`;

  if (!interaction) return;

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg });
    } else if (interaction.isRepliable?.()) {
      await interaction.reply({ content: msg });
    }
  } catch (e) {
    console.error(`${EMOJIS.ERROR} Impossible d'envoyer le message d'erreur:`, e);
  }
}

async function checkAndNotifyPriceDrops(client) {
  try {
    const allWishlists = await db.getAllUserAlerts();
    const allAdminAlerts = await alerts.getAllAdminAlerts();
    const allUserConfigs = await db.getAllUserNotificationConfigs();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    for (const [userId, wishlist] of Object.entries(allWishlists)) {
      const config = allUserConfigs[userId] || { hour: 20, interval: 1, lastSent: null };
      
      // Vérifier si c'est le bon moment pour cet utilisateur
      if (currentHour !== config.hour || currentMinute !== 0) continue;
      
      // Vérifier la fréquence (jour du cycle)
      const cycleDay = currentDay % config.interval;
      if (cycleDay !== 0) continue;
      
      // Vérifier qu'on n'a pas déjà envoyé aujourd'hui
      const today = new Date().toDateString();
      if (config.lastSent === today) continue;

      const triggered = await alerts.checkUserAlertPrices(userId);

      if (triggered.length === 0) continue;

      try {
        const user = await client.users.fetch(userId);
        const { EmbedBuilder } = require('discord.js');
        const { COLORS } = require('./constants');

        const embed = new EmbedBuilder()
          .setColor(COLORS.ALERT)
          .setTitle(`${EMOJIS.FIRE} Tes jeux en promotion !`)
          .setDescription(`Voici les jeux de ta wishlist qui sont en promotion:`)
          .setTimestamp();

        triggered.forEach((alert, index) => {
          embed.addFields({
            name: `${index + 1}. ${alert.appName}`,
            value: `**${alert.discount}%** de réduction! ~~${alert.originalPrice.toFixed(2)}€~~ → **${alert.currentPrice.toFixed(2)}€**\n[Voir sur Steam](https://store.steampowered.com/app/${alert.appid})`,
            inline: false
          });
        });

        await user.send({ embeds: [embed] }).catch(() => {});
        
        // Mettre à jour la dernière date d'envoi
        config.lastSent = today;
        await db.setUserNotificationConfig(userId, config);
      } catch (e) {
        console.error(`${EMOJIS.ERROR} Failed to DM user ${userId}:`, e.message);
      }
    }

    // Système d'alertes admin (immédiat)
    for (const [guildId, adminAlertList] of Object.entries(allAdminAlerts)) {
      const triggered = await alerts.checkAdminAlertPrices(guildId);

      for (const alert of triggered) {
        try {
          const guild = await client.guilds.fetch(guildId);
          const announcementChannel = guild.channels.cache.find(
            c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages')
          );

          if (!announcementChannel) continue;

          const { EmbedBuilder } = require('discord.js');
          const { COLORS } = require('./constants');

          const embed = new EmbedBuilder()
            .setColor(COLORS.ALERT)
            .setTitle(`${EMOJIS.ANNOUNCEMENT} ${alert.appName} is on sale!`)
            .addFields(
              { name: 'Discount', value: `${alert.discount}%`, inline: true },
              { name: 'Current Price', value: `${alert.currentPrice.toFixed(2)}€`, inline: true },
              { name: 'Original Price', value: `${alert.originalPrice.toFixed(2)}€`, inline: true }
            )
            .setURL(`https://store.steampowered.com/app/${alert.appid}`);

          await announcementChannel.send({ embeds: [embed] }).catch(() => {});
        } catch (e) {
          console.error(`${EMOJIS.ERROR} Failed to announce in guild ${guildId}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error(`${EMOJIS.ERROR} Price check error:`, e.message);
  }
}

async function checkAndSendDailyAlerts(client) {
  try {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (hour !== 20 || minute !== 0) return;

    const allDailyAlerts = await db.getAllDailyAlerts();
    const allAdminAlerts = await alerts.getAllAdminAlerts();

    for (const [guildId, channelIds] of Object.entries(allDailyAlerts)) {
      const guild = await client.guilds.fetch(guildId);
      
      for (const channelId of channelIds) {
        try {
          const channel = await guild.channels.fetch(channelId);
          if (!channel || !channel.isTextBased()) continue;

          const triggered = await alerts.checkAdminAlertPrices(guildId);
          
          if (triggered.length === 0) continue;

          const { EmbedBuilder } = require('discord.js');
          const { COLORS } = require('./constants');

          const embed = new EmbedBuilder()
            .setColor(COLORS.ALERT)
            .setTitle(`${EMOJIS.ANNOUNCEMENT} Promotions du jour à 20h`)
            .setDescription('Voici les jeux en promotion aujourd\'hui:')
            .setTimestamp();

          triggered.forEach((alert, index) => {
            embed.addFields({
              name: `${index + 1}. ${alert.appName}`,
              value: `**${alert.discount}%** de réduction! ~~${alert.originalPrice.toFixed(2)}€~~ → **${alert.currentPrice.toFixed(2)}€**\n[Voir sur Steam](https://store.steampowered.com/app/${alert.appid})`,
              inline: false
            });
          });

          await channel.send({ embeds: [embed] });
        } catch (e) {
          console.error(`${EMOJIS.ERROR} Failed to send daily alert to ${channelId}:`, e.message);
        }
      }
    }
  } catch (e) {
    console.error(`${EMOJIS.ERROR} Daily alert error:`, e.message);
  }
}

(async () => {
  await db.init();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', () => {
    console.log(`${EMOJIS.SUCCESS} ${client.user.tag} est en ligne`);

    setInterval(() => {
      checkAndNotifyPriceDrops(client);
    }, COOLDOWN.PRICE_CHECK);

    setInterval(() => {
      checkAndSendDailyAlerts(client);
    }, 60000); // Vérifier chaque minute
  });

  client.on('guildCreate', (guild) => {
    const chan =
      guild.systemChannel ||
      guild.channels.cache.find(
        (c) => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages')
      );

    chan?.send(`👋 Merci de m'avoir ajouté ! \`/help\` pour les commandes.`).catch(() => {});
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      await handleInteraction(interaction);
    } catch (err) {
      await handleError('interactionCreate', interaction, err);
    }
  });

  client.login(token);
})();
