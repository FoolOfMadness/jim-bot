//scran admin commands
import { SlashCommandBuilder } from 'discord.js';
import {
  loadScranState,
  saveScranState,
  createScranLeaderboard,
} from '#utils/scranUtils';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';

export const data = new SlashCommandBuilder()
  .setName('scran-admin')
  .setDescription('Admin tools for Scran')
  .addSubcommand((sub) =>
    sub.setName('setup').setDescription('Create the Scran leaderboard')
  );

//make a new leaderboard
export async function execute(interaction) {
  //permission check
  if (!interaction.member.permissions.has('Administrator')) {
    return interaction.reply({
      content: '❌ You do not have permission to use this command.',
      flags: EPHEMERAL_FLAG,
    });
  }

  const sub = interaction.options.getSubcommand();

  const state = loadScranState();

  //check if a leaderboard existss
  if (sub === 'setup') {
    if (state.leaderboardThreadId) {
      return interaction.reply({
        content: '🏆 Scran leaderboard already exists.',
        flags: EPHEMERAL_FLAG,
      });
    }
    await interaction.deferReply({
      flags: EPHEMERAL_FLAG,
    });

    //make leaderboard
    const result = await createScranLeaderboard(interaction.client, state);
    //save
    saveScranState(state);
    //confirm
    return interaction.editReply({
      content: `🏆 Scran leaderboard created!\n` + `<#${result.thread.id}>`,
    });
  }
}
