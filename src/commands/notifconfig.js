const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');
const { EMOJIS, COLORS } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
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

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const hour = interaction.options.getInteger('heure');
    const interval = interaction.options.getInteger('frequence');

    const config = {
      hour,
      interval,
      lastSent: null
    };

    await db.setUserNotificationConfig(interaction.user.id, config);

    const embed = new EmbedBuilder()
      .setColor(COLORS.SUCCESS)
      .setTitle(`${EMOJIS.BELL} Configuration des alertes`)
      .setDescription(`Tes alertes de prix sont configurées !`)
      .addFields(
        { name: 'Heure de réception', value: `${hour}:00`, inline: true },
        { name: 'Fréquence', value: `Tous les ${interval} jours`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
