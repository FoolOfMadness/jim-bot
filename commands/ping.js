//ping command
import { SlashCommandBuilder, MessageFlagsBitField } from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!');

const cooldown = new Set();
const cooldownTime = 5000;

export const execute = async (interaction) => {
  if (cooldown.has(interaction.user.id)) {
    return interaction.reply({
      content: 'Please wait before using this command again.',
      flags: MessageFlagsBitField.Ephemeral,
    });
  }

  cooldown.add(interaction.user.id);
  setTimeout(() => cooldown.delete(interaction.user.id), cooldownTime);

  await interaction.reply({
    content: 'Pinging...',
    flags: MessageFlagsBitField.Ephemeral,
  });

  const sent = await interaction.fetchReply();

  await interaction.editReply({
    content: `Roundtrip latency: ${
      sent.createdTimestamp - interaction.createdTimestamp
    }ms`,
    flags: MessageFlagsBitField.Ephemeral,
  });
};
