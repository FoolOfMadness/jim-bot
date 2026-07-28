//wordle start button
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ChannelType,
  PermissionFlagsBits,
  ThreadAutoArchiveDuration,
} from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statePath = path.join(__dirname, '../../data/wordleState.json');

export async function handleWordleStart(interaction) {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'wordle_start') return;

  const state = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
    : {};

  const userId = interaction.user.id;

  //player already has a game
  const existingPlayer = state.players?.[userId];

  if (existingPlayer?.threadId && !existingPlayer.completed) {
    try {
      const thread = await interaction.guild.channels.fetch(
        existingPlayer.threadId
      );

      return interaction.reply({
        content: `You already have an active game: ${thread}`,
        ephemeral: true,
      });
    } catch {
      //thread deleted, continue
    }
  }

  const forumPost = interaction.channel;

  const playerThread = await forumPost.threads.create({
    name: `wordle-${interaction.user.username}`.toLowerCase(),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    type: ChannelType.PrivateThread,
    invitable: false,
    reason: `Wordle game for ${interaction.user.tag}`,
  });

  await playerThread.members.add(interaction.user.id);

  await playerThread.send(
    [
      '# 🎮 Daily Wordle',
      '',
      `Welcome <@${interaction.user.id}>!`,
      '',
      `Wordle #${state.wordNumber}`,
      '',
      'Type a 5-letter word to make your first guess.',
      '',
      'You have **6 attempts**.',
    ].join('\n')
  );

  state.players ??= {};

  state.players[userId] = {
    username: interaction.user.username,
    wordNumber: state.wordNumber,
    threadId: playerThread.id,
    guesses: [],
    completed: false,
    startedAt: Date.now(),
  };

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  await interaction.reply({
    content: `Your Wordle thread is ready: ${playerThread}`,
    ephemeral: true,
  });
}
