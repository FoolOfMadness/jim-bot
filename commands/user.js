//user command
import { SlashCommandBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '../constants/discordDefinitions.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('user')
  .setDescription('Provides information about the user.');

export const execute = async (interaction) => {
  await interaction.reply({
    content: `This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`,
    flags: EPHEMERAL_FLAG,
  });
};
