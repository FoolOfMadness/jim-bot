//ping command
import { SlashCommandBuilder, MessageFlagsBitField } from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!');

export const execute = async (interaction) => {
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

const cooldown = 5;
