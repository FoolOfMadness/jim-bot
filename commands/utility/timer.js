//timer command
import { SlashCommandBuilder, MessageFlagsBitField } from 'discord.js';

//store active timers
const activeTimers = new Map();

//name of slash command, subcommands, & description
export const data = new SlashCommandBuilder()
  .setName('timer')
  .setDescription('Manage countdown timers')
  .addSubcommand((sub) =>
    sub
      .setName('start')
      .setDescription('Start a new timer')
      .addStringOption((opt) =>
        opt
          .setName('duration')
          .setDescription('Time (e.g., 10s, 5m, 2h)')
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName('label')
          .setDescription('Label for the timer')
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('cancel')
      .setDescription('Cancel a running timer')
      .addStringOption((opt) =>
        opt
          .setName('label')
          .setDescription('Label of the timer to cancel')
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('List your active timers')
  );

export const execute = async (interaction) => {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;
  const label = interaction.options.getString('label') || 'Timer';

  //list active timers
  if (subcommand === 'list') {
    const timers = activeTimers.get(userId);
    if (!timers || Object.keys(timers).length === 0) {
      return interaction.reply({
        content: '⏱️ You have no active timers.',
        flags: MessageFlagsBitField.Ephemeral,
      });
    }

    const list = Object.keys(timers)
      .map((l) => `• **${l}**`)
      .join('\n');
    return interaction.reply({
      content: `⏱️ Your active timers:\n${list}`,
      flags: MessageFlagsBitField.Ephemeral,
    });
  }

  //cancel a timer
  if (subcommand === 'cancel') {
    const timers = activeTimers.get(userId);
    if (timers && timers[label]) {
      clearTimeout(timers[label]);
      delete timers[label];
      return interaction.reply({
        content: `❌ Timer **${label}** canceled.`,
        flags: MessageFlagsBitField.Ephemeral,
      });
    } else {
      return interaction.reply({
        content: `⚠️ No active timer found with label **${label}**.`,
        flags: MessageFlagsBitField.Ephemeral,
      });
    }
  }

  //start a new timer
  if (subcommand === 'start') {
    const durationInput = interaction.options.getString('duration');
    const match = durationInput.match(/^(\d+)(s|m|h)$/);
    if (!match) {
      return interaction.reply({
        content: '❌ Invalid duration format. Use `10s`, `5m`, or `2h`.',
        flags: MessageFlagsBitField.Ephemeral,
      });
    }

    const [_, amount, unit] = match;
    const ms =
      unit === 's'
        ? amount * 1000
        : unit === 'm'
        ? amount * 60 * 1000
        : amount * 60 * 60 * 1000;

    //duplicate label check
    const timers = activeTimers.get(userId) || {};
    if (timers[label]) {
      return interaction.reply({
        content: `⚠️ You already have a timer labeled **${label}**.`,
        flags: MessageFlagsBitField.Ephemeral,
      });
    }

    //time up ping message
    const timeout = setTimeout(() => {
      interaction.followUp({
        content: `⏰ <@${userId}> **${label}** timer is up!`,
      });
      delete timers[label];
    }, ms);

    timers[label] = timeout;
    activeTimers.set(userId, timers);

    //timer started message
    return interaction.reply({
      content: `⏳ **${label}** timer started for ${durationInput}.`,
      flags: MessageFlagsBitField.Ephemeral,
    });
  }
};
