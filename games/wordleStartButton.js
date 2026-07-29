//wordle start button handler
import fs from 'fs';
import { ChannelType, ThreadAutoArchiveDuration } from 'discord.js';
import { loadWordleState, saveWordleState } from '#utils/wordleUtils';
import { WORDLE_FORUM_CHANNEL_ID } from '#constants/env';
import { EPHERMERAL_FLAG } from '#constants/env';

//start button
export async function handleWordleStart(interaction) {
  //ignore non-buttons
  if (!interaction.isButton()) return;

  //ignore other buttons
  if (interaction.customId !== 'wordle_start') {
    return;
  }
  const state = loadWordleState();
  const userId = interaction.user.id;

  //check for active game today
  const existingPlayer = state.players?.[userId];

  if (existingPlayer?.threadId && !existingPlayer.completed) {
    try {
      const thread = await interaction.guild.channels.fetch(
        existingPlayer.threadId
      );
      return interaction.reply({
        content: `🎮 You already have an active Wordle:\n${thread}`,
        flags: EPHERMERAL_FLAG,
      });
    } catch {
      //thread already deleted
    }
  }

  //wordle forum channel
  const forum = await interaction.guild.channels.fetch(WORDLE_FORUM_CHANNEL_ID);

  //create private post
  const playerThread = await forum.threads.create({
    name: `🎮 ${interaction.user.username} - Wordle #${state.wordNumber}`.slice(
      0,
      100
    ),
    type: ChannelType.PrivateThread,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    invitable: false,
    reason: `Wordle game for ${interaction.user.tag}`,
  });

  //add player to post
  await playerThread.members.add(interaction.user.id);

  //start game message
  const wordLengthDisplay = '⬜'.repeat(state.answer.length);
  await playerThread.send(
    [
      '# 🎮 Daily Wordle',
      '',
      `Welcome <@${interaction.user.id}>!`,
      '',
      `Wordle #${state.wordNumber}`,
      '',
      wordLengthDisplay,
      '',
      `(${state.answer.length} letters)`,
      '',
      'You have **6 attempts**.',
      '',
      '🟩 Correct letter',
      '🟨 Wrong position',
      '⬛ Not in word',
    ].join('\n')
  );

  //register player in state
  state.players ??= {};
  state.players[userId] = {
    username: interaction.user.username,
    wordNumber: state.wordNumber,
    threadId: playerThread.id,
    guesses: [],
    completed: false,
    failed: false,
    attempts: null,
    startedAt: Date.now(),
  };
  saveWordleState(state);

  await interaction.reply({
    content: `🎮 Your Wordle thread is ready:\n${playerThread}`,
    flags: EPHERMERAL_FLAG,
  });
}
