const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { EMOJIS, COLORS } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dailyalert')
    .setDescription('Configure le salon pour les alertes quotidiennes (admin)')
    .addChannelOption(option =>
      option
        .setName('salon')
        .setDescription('Salon où envoyer les alertes quotidiennes')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel('salon');
    const added = await db.setDailyAlertChannel(interaction.guildId, channel.id);

    if (added) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(`${EMOJIS.BELL} Salon configuré`)
        .setDescription(`Les alertes quotidiennes seront envoyées dans <#${channel.id}> à 20h chaque jour`);
      
      await interaction.editReply({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.BELL_OFF} Salon retiré`)
        .setDescription(`Les alertes quotidiennes ne seront plus envoyées dans <#${channel.id}>`);
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
