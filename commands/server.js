//server command
import { SlashCommandBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '../constants/discordDefinitions';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('server')
  .setDescription('Provides information about the server.');

export const execute = async (interaction) => {
  await interaction.reply({
    content: `This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members.`,
    flags: EPHEMERAL_FLAG,
  });
};
