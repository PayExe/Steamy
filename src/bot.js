require('dotenv').config();
const { Client, GatewayIntentBits, InteractionType } = require('discord.js');
const db = require('./db');
const wishlist = require('./commands/wishlist');
const library = require('./commands/library');
const random = require('./commands/random');
const help = require('./commands/help');
const setchannel = require('./commands/setchannel');
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

(async () => {
  await db.init();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', () => {
    console.log(`${EMOJIS.SUCCESS} ${client.user.tag} est en ligne`);
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
