//ping command
import { SlashCommandBuilder } from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!');

export const execute = async (interaction) => {
  await interaction.reply({
    content: 'Pinging...',
  });

  const sent = await interaction.fetchReply();

  await interaction.editReply(
    `Roundtrip latency: ${
      sent.createdTimestamp - interaction.createdTimestamp
    }ms`
  );
};

const cooldown = 5;
