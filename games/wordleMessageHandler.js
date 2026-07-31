//wordle message handler
import {
  loadWordleState,
  saveWordleState,
  buildBoard,
  attemptsRemaining,
  getResultMessage,
  isValidGuess,
  loadWordleWords,
  updateWordleLeaderboard,
  updateWordleHistoryEntry,
  updateDailyWordlePost,
} from '#utils/wordleUtils';
import { EmbedBuilder } from 'discord.js';

//add completed game result
function addWordleResult(state, player, userId) {
  state.results ??= {};

  //prevent duplicate result entries
  if (state.results[userId]) {
    return;
  }
  state.results[userId] = {
    userId,
    username: player.username,
    attempts: player.attempts,
    won: !player.failed,
    completedAt: player.completedAt,
  };
}

//handle messages in wordle thread
export async function handleWordleMessage(message) {
  //ignore bots
  if (message.author.bot) return;

  //thread only
  if (!message.channel.isThread()) return;

  //load state
  const state = loadWordleState();

  //find active game
  const player = state.players?.[message.author.id];

  //if no player, ignore message
  if (!player) return;

  //get embed
  const gameMessage = await message.channel.messages.fetch(player.messageId);

  //ignore messages outside of the player's thread
  if (message.channel.id !== player.threadId) return;

  //ignore completed games
  if (player.completed) return;

  const guess = message.content.trim().toUpperCase();
  const words = loadWordleWords();

  //validate
  if (!isValidGuess(guess, state.answer, words)) {
    const board = buildBoard(player.guesses, state.answer);

    await gameMessage.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🎮 Daily Wordle #${state.wordNumber}`)
          .setDescription(
            [
              board || '⬜⬜⬜⬜⬜',
              '',
              `❌ **${guess} is not a valid word.**`,
              '',
              `Attempts Remaining: **${attemptsRemaining(player.guesses)}**`,
            ].join('\n')
          )
          .setColor('Red'),
      ],
    });
    return;
  }

  //save guess
  player.guesses.push(guess);
  const solved = guess === state.answer.toUpperCase();
  const board = buildBoard(player.guesses, state.answer);

  //player wins
  if (solved) {
    player.completed = true;
    player.failed = false;
    player.attempts = player.guesses.length;
    player.completedAt = Date.now();

    addWordleResult(state, player, message.author.id);

    saveWordleState(state);

    updateWordleHistoryEntry(state);

    await updateDailyWordlePost(message.client, state);
    await updateWordleLeaderboard(message.client, state);

    await gameMessage.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle(`🎉 Wordle #${state.wordNumber} Complete`)
          .setDescription(
            `${board}\n\n${getResultMessage(player.guesses.length)}`
          )
          .setColor('Gold'),
      ],
    });
    await deleteGuessMessage(message);
    return;
  }

  //player lose
  if (player.guesses.length >= 6) {
    player.completed = true;
    player.failed = true;
    player.attempts = 6;
    player.completedAt = Date.now();

    addWordleResult(state, player, message.author.id);

    saveWordleState(state);

    updateWordleHistoryEntry(state);

    await updateDailyWordlePost(message.client, state);
    await updateWordleLeaderboard(message.client, state);

    await gameMessage.edit({
      embeds: [
        new EmbedBuilder()
          .setTitle(`❌ Wordle #${state.wordNumber} Failed`)
          .setDescription(`${board}\n\nThe answer was **${state.answer}**.`)
          .setColor('Red'),
      ],
    });
    await deleteGuessMessage(message);
    return;
  }

  //continue game
  saveWordleState(state);

  await gameMessage.edit({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🎮 Daily Wordle #${state.wordNumber}`)
        .setDescription(
          `${board}\n\n` +
            `Attempts Remaining: **${attemptsRemaining(player.guesses)}**`
        )
        .setColor('Green'),
    ],
  });
  await deleteGuessMessage(message);
}

//delete guess
async function deleteGuessMessage(message) {
  try {
    await message.delete();
  } catch (err) {
    if (err.code !== 10008) {
      console.error('Failed deleting guess:', err);
    }
  }
}
