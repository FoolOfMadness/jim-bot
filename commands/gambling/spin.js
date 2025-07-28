//spin command
import { SlashCommandBuilder, MessageFlagsBitField } from 'discord.js';

//name of slash command & description

export const data = new SlashCommandBuilder()
  .setName('spin')
  .setDescription('Spin a custom wheel!')
  .addStringOption((option) =>
    option
      .setName('options')
      .setDescription(
        'Comma-separated list of options (e.g., win,lose,jackpot)'
      )
      .setRequired(true)
  );

export const execute = async (interaction) => {
  const input = interaction.options.getString('options');
  const segments = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return interaction.reply({
      content: 'Please provide at least two options to spin the wheel.',
      flags: MessageFlagsBitField.Ephemeral,
    });
  }

  await interaction.reply('Spinning the wheel... 🎡');

  // Simulate suspense with emoji animation
  const spinFrames = ['🔵', '🟢', '🟡', '🟠', '🔴'];
  let frameIndex = 0;

  const spinMessage = async () => {
    await interaction.editReply(
      `Spinning... ${spinFrames[frameIndex % spinFrames.length]}`
    );
    frameIndex++;
    if (frameIndex < 10) {
      setTimeout(spinMessage, 300);
    } else {
      const result = segments[Math.floor(Math.random() * segments.length)];
      interaction.editReply(`🎉 The wheel landed on: **${result}**`);
    }
  };

  spinMessage();
};
