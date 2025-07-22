//ping command
import { SlashCommandBuilder } from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong!');

export const execute = async (interaction) => {
  const sent = await interaction.reply({
    content: 'Pinging...',
    fetchReply: true,
  });
  interaction.editReply(
    `Roundtrip latency: ${
      sent.createdTimestamp - interaction.createdTimestamp
    }ms`
  );
};

const cooldown = 5;
