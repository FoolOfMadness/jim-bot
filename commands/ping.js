//ping command
import { SlashCommandBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '../constants/discordDefinitions';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong');

const cooldown = new Set();
const cooldownTime = 5000;

export const execute = async (interaction) => {
  if (cooldown.has(interaction.user.id)) {
    return interaction.reply({
      content: 'Please wait before using this command again.',
      flags: EPHEMERAL_FLAG,
    });
  }

  cooldown.add(interaction.user.id);
  setTimeout(() => cooldown.delete(interaction.user.id), cooldownTime);

  await interaction.reply({
    content: 'Pinging...',
    flags: EPHEMERAL_FLAG,
  });

  const sent = await interaction.fetchReply();

  await interaction.editReply({
    content: `Roundtrip latency: ${
      sent.createdTimestamp - interaction.createdTimestamp
    }ms`,
    flags: EPHEMERAL_FLAG,
  });
};
