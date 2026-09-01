const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const alerts = require('../alerts');
const steam = require('../steam');
const { EMOJIS, COLORS, PAGINATION } = require('../constants');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('adminalerts')
    .setDescription('Manage admin game alerts')
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
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async autocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const input = interaction.options.getFocused(true);

    if (subcommand === 'add') {
      if (!input.value) {
        interaction.respond([]);
        return;
      }

      const results = await steam.searchGames(input.value);
      const choices = results.slice(0, 25).map(g => ({
        name: g.name.substring(0, 100),
        value: g.appid.toString(),
      }));
      await interaction.respond(choices);
    } else if (subcommand === 'remove') {
      const adminAlerts = await alerts.getAdminAlerts(interaction.guildId);
      const filtered = adminAlerts.filter(a =>
        a.name.toLowerCase().includes(input.value.toLowerCase())
      );

      const choices = filtered.slice(0, 25).map(a => ({
        name: a.name.substring(0, 100),
        value: a.name,
      }));

      await interaction.respond(choices);
    }
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      await handleAdd(interaction);
    } else if (subcommand === 'remove') {
      await handleRemove(interaction);
    } else if (subcommand === 'list') {
      await handleList(interaction);
    }
  },
};

async function handleAdd(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const appid = interaction.options.getString('game');
  const details = await steam.getAppDetails(appid);

  if (!details) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`${EMOJIS.ERROR} Game Not Found`)
      .setDescription('Could not fetch game details from Steam');
    
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const result = await alerts.addAdminAlert(interaction.guildId, details.name, appid);

  if (!result.success) {
    let description = 'An error occurred';
    
    if (result.reason === 'duplicate') {
      description = 'This game is already being monitored';
    }

    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`${EMOJIS.ERROR} Failed to Add Alert`)
      .setDescription(description);
    
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`${EMOJIS.SHIELD} Alert Added`)
    .setDescription(`**${details.name}** is now being monitored\nServer alerts will be posted when it goes on sale`)
    .setThumbnail(details.header_image || null);
  
  await interaction.editReply({ embeds: [embed] });
}

async function handleRemove(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const gameName = interaction.options.getString('game');
  const result = await alerts.removeAdminAlert(interaction.guildId, gameName);

  if (!result.success) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.ERROR)
      .setTitle(`${EMOJIS.ERROR} Game Not Found`)
      .setDescription('This game is not in the monitor list');
    
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle(`${EMOJIS.TRASH} Alert Removed`)
    .setDescription(`**${result.removed.name}** is no longer being monitored`);
  
  await interaction.editReply({ embeds: [embed] });
}

async function handleList(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const adminAlerts = await alerts.getAdminAlerts(interaction.guildId);

  if (adminAlerts.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.MAILBOX_EMPTY} No Alerts`)
      .setDescription('No games are being monitored\nUse `/adminalerts add` to start monitoring');
    
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const totalPages = Math.ceil(adminAlerts.length / PAGINATION.ITEMS_PER_PAGE);
  let currentPage = 0;

  const buildEmbed = () => {
    const start = currentPage * PAGINATION.ITEMS_PER_PAGE;
    const end = start + PAGINATION.ITEMS_PER_PAGE;
    const items = adminAlerts.slice(start, end);

    const embed = new EmbedBuilder()
      .setColor(COLORS.PRIMARY)
      .setTitle(`${EMOJIS.SHIELD} Monitored Games`)
      .setDescription(items
        .map((a, i) => `${start + i + 1}. **${a.name}**`)
        .join('\n')
      )
      .setFooter({ text: `Page ${currentPage + 1}/${totalPages} • Total: ${adminAlerts.length}` });

    return embed;
  };

  const buildButtons = () => {
    const row = new ActionRowBuilder();

    if (currentPage > 0) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    if (currentPage < totalPages - 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setStyle(ButtonStyle.Secondary)
      );
    }

    return row;
  };

  const message = await interaction.editReply({
    embeds: [buildEmbed()],
    components: totalPages > 1 ? [buildButtons()] : [],
  });

  if (totalPages <= 1) return;

  const collector = message.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 60000,
  });

  collector.on('collect', async (i) => {
    if (i.customId === 'next') currentPage++;
    if (i.customId === 'prev') currentPage--;

    await i.update({
      embeds: [buildEmbed()],
      components: [buildButtons()],
    });
  });

  collector.on('end', () => {
    message.edit({ components: [] }).catch(() => {});
  });
}
