//wordle message handler
import {
  loadWordleState,
  saveWordleState,
  loadWords,
  scoreGuess,
  buildBoard,
  attemptsRemaining,
  getResultMessage,
  isValidGuess,
  loadWordleWords,
  updateWordleLeaderboard,
  updateWordleHistoryEntry,
} from '#utils/wordleUtils';

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

  //ignore messages outside of the player's thread
  if (message.channel.id !== player.threadId) return;

  //ignore completed games
  if (player.completed) return;

  const guess = message.content.trim().toUpperCase();
  const words = loadWordleWords();

  //validate
  if (!isValidGuess(guess, words)) {
    console.log('Rejected guess:', guess);

    return message.reply(
      `❌ Please enter a valid ${state.answer.length}-letter word.`
    );
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
    await updateWordleLeaderboard(message.client, state);
    updateWordleHistoryEntry(state);

    return message.reply(
      `${board}\n\n` + `${getResultMessage(player.guesses.length)}`
    );
  }

  //player lose
  if (player.guesses.length >= 6) {
    player.completed = true;
    player.failed = true;
    player.attempts = 6;
    player.completedAt = Date.now();

    addWordleResult(state, player, message.author.id);
    saveWordleState(state);
    await updateWordleLeaderboard(message.client, state);
    updateWordleHistoryEntry(state);

    return message.reply(
      `${board}\n\n` +
        `❌ You ran out of guesses.\n` +
        `The answer was **${state.answer}**.`
    );
  }
  //continue game
  saveWordleState(state);

  return message.reply(
    `${board}\n\n` +
      `Attempts Remaining: **${attemptsRemaining(player.guesses)}**`
  );
}
