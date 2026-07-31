// wordle-admin command
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';
import { postDailyWordle } from '#temporal/wordleScheduler';
import {
  loadWordleState,
  saveWordleState,
  buildWordleResults,
  saveWordleHistory,
  createWordleLeaderboard,
} from '#utils/wordleUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('wordle-admin')
  .setDescription('Admin tools for Wordle system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub.setName('post').setDescription('Force create a new Wordle')
  )
  .addSubcommand((sub) =>
    sub.setName('state').setDescription('View current Wordle state')
  )
  .addSubcommand((sub) =>
    sub.setName('end').setDescription('Force end current Wordle')
  )
  .addSubcommand((sub) =>
    sub.setName('reset').setDescription('Reset active Wordle')
  )
  .addSubcommand((sub) =>
    sub
      .setName('create-leaderboard')
      .setDescription('Create the Wordle leaderboard post')
  );

//check if admin first
export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Admin only.',
      flags: EPHEMERAL_FLAG,
    });
  }
  const sub = interaction.options.getSubcommand();

  const state = loadWordleState();

  //force post
  if (sub === 'post') {
    await postDailyWordle(interaction.client);

    return interaction.reply({
      content: '🚀 Forced Wordle post.',
      flags: EPHEMERAL_FLAG,
    });
  }

  //check state
  if (sub === 'state') {
    return interaction.reply({
      content: [
        `🟩 Wordle #${state.wordNumber}`,
        `Answer: ||${state.answer}||`,
        `Last Word: ||${state.lastWord ?? 'None'}||`,
        `Players: ${Object.keys(state.players ?? {}).length}`,
        `Completed: ${
          Object.values(state.players ?? {}).filter((p) => p.completed).length
        }`,
      ].join('\n'),
      flags: EPHEMERAL_FLAG,
    });
  }

  //end now
  if (sub === 'end') {
    if (!state.wordNumber) {
      return interaction.reply({
        content: '❌ No active Wordle.',
        flags: EPHEMERAL_FLAG,
      });
    }
    saveWordleHistory(state);

    return interaction.reply({
      content: buildWordleResults(state),
      flags: EPHEMERAL_FLAG,
    });
  }

  //reset
  if (sub === 'reset') {
    saveWordleState({
      wordNumber: 0,
      answer: null,
      lastWord: null,
      activePostId: null,
      players: {},
      results: {},
    });
    return interaction.reply({
      content: '♻️ Wordle state reset.',
      flags: EPHEMERAL_FLAG,
    });
  }

  //create leaderboard
  if (sub === 'create-leaderboard') {
    if (state.leaderboardThreadId) {
      return interaction.reply({
        content: '❌ Wordle leaderboard already exists.',
        flags: EPHEMERAL_FLAG,
      });
    }
    const result = await createWordleLeaderboard(interaction.client);

    state.leaderboardThreadId = result.thread.id;
    state.leaderboardMessageId = result.message.id;

    saveWordleState(state);

    return interaction.reply({
      content: `🏆 Wordle leaderboard created:\n${result.thread}`,
      flags: EPHEMERAL_FLAG,
    });
  }
}
