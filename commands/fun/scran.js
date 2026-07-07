//scran commands
import { SlashCommandBuilder } from 'discord.js';
import {
  loadScranState,
  saveScranState,
  createScranThread,
  getScranProfile,
  buildScranProfileEmbed,
} from '#utils/scranUtils';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('scran')
  .setDescription('Partake in the scran economy')
  .addSubcommand((sub) =>
    sub.setName('start').setDescription('Create your scran board')
  )
  .addSubcommand((sub) =>
    sub
      .setName('profile')
      .setDescription('View a scran profile')
      .addUserOption((opt) =>
        opt.setName('user').setDescription('User to view').setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('leaderboard').setDescription('View scran leaderboard')
  );

//scran
export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  const state = loadScranState();

  if (!state.users) {
    state.users = {};
  }

  //start
  if (sub === 'start') {
    const userId = interaction.user.id;

    //check if user already has thread
    if (state.users[userId]) {
      return interaction.reply({
        content: '🍔 You already have a scran board.',
        flags: EPHEMERAL_FLAG,
      });
    }
    await interaction.deferReply({
      flags: EPHEMERAL_FLAG,
    });

    //make the thread
    try {
      const result = await createScranThread(
        interaction.client,
        interaction.user
      );
      //save info
      state.users[userId] = {
        userId,
        threadId: result.thread.id,
        profileMessageId: result.message.id,
        score: 0,
        posts: 0,
        messages: {},
      };
      saveScranState(state);
      //confirm message
      return interaction.editReply({
        content:
          `🍔 Your scran board has been created!\n` + `<#${result.thread.id}>`,
      });
    } catch (err) {
      console.error('Failed to create scran board:', err);
      //fail message
      return interaction.editReply({
        content: '❌ Failed to create your scran board.',
      });
    }
  }

  //profile
  if (sub === 'profile') {
    const user = interaction.options.getUser('user') ?? interaction.user;
    //check if user has a profile
    const profile = getScranProfile(state, user.id);
    //no profile message
    if (!profile) {
      return interaction.reply({
        content: '❌ That user does not have a scran board.',
        flags: EPHEMERAL_FLAG,
      });
    }
    //make embed with profil
    const embed = buildScranProfileEmbed(user.id, profile, user);
    //send it
    return interaction.reply({
      embeds: [embed],
      flags: EPHEMERAL_FLAG,
    });
  }

  //leaderboard
  if (sub === 'leaderboard') {
    const users = Object.entries(state.users);
    //if no scrans
    if (!users.length) {
      return interaction.reply({
        content: '🍔 No scran boards yet.',
        flags: EPHEMERAL_FLAG,
      });
    }
    //sort and display leaderboard
    const sorted = users
      .sort(([, a], [, b]) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10);

    const lines = sorted.map(
      ([id, user], index) =>
        `**${index + 1}.** <@${id}> — ⭐ ${user.score ?? 0}`
    );

    return interaction.reply({
      content: `# 🍔 Scran Leaderboard\n\n${lines.join('\n')}`,
      flags: EPHEMERAL_FLAG,
    });
  }
}
