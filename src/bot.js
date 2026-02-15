require('dotenv').config();
const { Client, GatewayIntentBits, InteractionType } = require('discord.js');
const db = require('./db');
const wishlist = require('./commands/wishlist');
const library = require('./commands/library');
const random = require('./commands/random');
const help = require('./commands/help');
const setchannel = require('./commands/setchannel');

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
if (!token) console.warn('⚠️ Token manquant, check ton .env');

const cooldowns = new Map();

(async () => {
  await db.init();
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', () => console.log(`✅ ${client.user.tag} est en ligne`));

  client.on('guildCreate', guild => {
    const chan = guild.systemChannel
      || guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(guild.members.me).has('SendMessages'));
    chan?.send("👋 Merci de m'avoir ajouté ! `/help` pour les commandes.").catch(() => {});
  });

  client.on('interactionCreate', async interaction => {
    try {
      if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        if (interaction.commandName === 'addwishlist' || interaction.commandName === 'removewishlist')
          return wishlist.autocomplete(interaction);
        if (interaction.commandName === 'library-steam')
          return library.autocomplete(interaction);
        return;
      }

      if (interaction.isButton() && interaction.customId.startsWith('wishlist_'))
        return wishlist.onButton(interaction);

      if (!interaction.isChatInputCommand()) return;

      console.log(`[${new Date().toLocaleString()}] ${interaction.user.tag} — /${interaction.commandName} (${interaction.guild?.name || 'DM'})`);

      if (interaction.commandName === 'setchannel') return setchannel.set(interaction);

      if (interaction.guild) {
        const allowed = await db.getAllowedChannels(interaction.guild.id);
        if (allowed.length && !allowed.includes(interaction.channelId)) {
          const list = allowed.map(id => `<#${id}>`).join(', ');
          return interaction.reply({ content: `❌ Commandes autorisées uniquement dans : ${list}`, ephemeral: true });
        }
      }

      const uid = interaction.user.id;
      const now = Date.now();
      if (now - (cooldowns.get(uid) || 0) < 3000)
        return interaction.reply({ content: '⏳ Attends un peu.', ephemeral: true });
      cooldowns.set(uid, now);

      switch (interaction.commandName) {
        case 'addwishlist':    return wishlist.add(interaction);
        case 'removewishlist': return wishlist.remove(interaction);
        case 'showwishlist':   return wishlist.show(interaction);
        case 'clearwishlist':  return wishlist.clear(interaction);
        case 'library-steam':  return library.handle(interaction);
        case 'random-steam':   return random.handle(interaction);
        case 'help':           return help.handle(interaction);
      }
    } catch (err) {
      console.error(`Erreur (${interaction.user?.tag}):`, err);
      const msg = '❌ Erreur inattendue.';
      if (interaction.deferred || interaction.replied)
        await interaction.editReply({ content: msg }).catch(() => {});
      else if (interaction.isRepliable?.())
        await interaction.reply({ content: msg }).catch(() => {});
    }
  });

  client.login(token);
})();
