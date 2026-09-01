require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { EMOJIS } = require('../src/constants');

const commands = [
  new SlashCommandBuilder()
    .setName('addwishlist')
    .setDescription('Ajoute un jeu à ta wishlist.')
    .addStringOption(o =>
      o
        .setName('jeu')
        .setDescription('Nom du jeu')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('removewishlist')
    .setDescription('Retire un jeu de ta wishlist.')
    .addStringOption(o =>
      o
        .setName('jeu')
        .setDescription('Nom du jeu')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('showwishlist')
    .setDescription('Affiche une wishlist.')
    .addUserOption(o =>
      o
        .setName('utilisateur')
        .setDescription("L'utilisateur dont tu veux voir la wishlist")
    )
    .addIntegerOption(o =>
      o.setName('page').setDescription('Numéro de page')
    ),

  new SlashCommandBuilder()
    .setName('clearwishlist')
    .setDescription('Vide ta wishlist.'),

  new SlashCommandBuilder()
    .setName('library-steam')
    .setDescription('Infos détaillées sur un jeu Steam.')
    .addStringOption(o =>
      o
        .setName('jeu')
        .setDescription('Nom du jeu')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('random-steam')
    .setDescription('Un jeu Steam au hasard.'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche la liste des commandes.'),

  new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('Ajoute/retire un salon autorisé (mods). Sans argument = reset.')
    .addChannelOption(o =>
      o
        .setName('salon')
        .setDescription('Le salon à ajouter/retirer')
        .addChannelTypes(ChannelType.GuildText)
    ),

  new SlashCommandBuilder()
    .setName('adminalerts')
    .setDescription('Manage admin game alerts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a game to admin watch list')
        .addStringOption(option =>
          option
            .setName('game')
            .setDescription('Game name to monitor')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a game from admin watch list')
        .addStringOption(option =>
          option
            .setName('game')
            .setDescription('Game name to remove')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('View all monitored games')
    ),

  new SlashCommandBuilder()
    .setName('dailyalert')
    .setDescription('Configure le salon pour les alertes quotidiennes (admin)')
    .addChannelOption(option =>
      option
        .setName('salon')
        .setDescription('Salon où envoyer les alertes quotidiennes')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  new SlashCommandBuilder()
    .setName('notifconfig')
    .setDescription('Configure tes alertes de prix')
    .addIntegerOption(option =>
      option
        .setName('heure')
        .setDescription('Heure de réception des alertes (0-23)')
        .setRequired(true)
        .addChoices(
          { name: '00:00', value: 0 },
          { name: '01:00', value: 1 },
          { name: '02:00', value: 2 },
          { name: '03:00', value: 3 },
          { name: '04:00', value: 4 },
          { name: '05:00', value: 5 },
          { name: '06:00', value: 6 },
          { name: '07:00', value: 7 },
          { name: '08:00', value: 8 },
          { name: '09:00', value: 9 },
          { name: '10:00', value: 10 },
          { name: '11:00', value: 11 },
          { name: '12:00', value: 12 },
          { name: '13:00', value: 13 },
          { name: '14:00', value: 14 },
          { name: '15:00', value: 15 },
          { name: '16:00', value: 16 },
          { name: '17:00', value: 17 },
          { name: '18:00', value: 18 },
          { name: '19:00', value: 19 },
          { name: '20:00', value: 20 },
          { name: '21:00', value: 21 },
          { name: '22:00', value: 22 },
          { name: '23:00', value: 23 }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('frequence')
        .setDescription('Fréquence des alertes en jours')
        .setRequired(true)
        .addChoices(
          { name: 'Tous les jours', value: 1 },
          { name: 'Tous les 2 jours', value: 2 },
          { name: 'Tous les 3 jours', value: 3 },
          { name: 'Tous les 4 jours', value: 4 },
          { name: 'Tous les 5 jours', value: 5 },
          { name: 'Tous les 6 jours', value: 6 },
          { name: 'Tous les 7 jours', value: 7 }
        )
    ),
].map(c => c.toJSON());

const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error(
    `${EMOJIS.ERROR} DISCORD_TOKEN/TOKEN et CLIENT_ID requis dans le .env`
  );
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(
      `${EMOJIS.LOADING} Déploiement de ${commands.length} commandes...`
    );
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(
      `${EMOJIS.SUCCESS} Commandes déployées avec succès !`
    );
  } catch (err) {
    console.error(
      `${EMOJIS.ERROR} Erreur lors du déploiement :`,
      err
    );
    process.exit(1);
  }
})();
