// wordle message handler
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  scoreGuess,
  buildBoard,
  isValidGuess,
  attemptsRemaining,
  getResultMessage,
  loadWords,
} from '#utils/wordleUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const statePath = path.join(__dirname, '../../data/wordleState.json');

const wordsPath = path.join(__dirname, '../../data/words.txt');

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

export async function handleWordleMessage(message) {
  //ignore bots
  if (message.author.bot) return;

  //no state file
  if (!fs.existsSync(statePath)) return;

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  //find active game
  const player = state.players?.[message.author.id];

  if (!player) return;

  //ignore messages outside of the player's thread
  if (message.channel.id !== player.threadId) {
    return;
  }

  //ignore completed games
  if (player.completed) {
    return;
  }

  const guess = message.content.trim().toUpperCase();

  const words = loadWords(wordsPath);

  //validate guess
  if (!isValidGuess(guess, words)) {
    return message.reply('❌ Please enter a valid 5-letter word.');
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

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

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

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    return message.reply(
      `${board}\n\n` +
        `❌ You ran out of guesses.\n` +
        `The answer was **${state.answer}**.`
    );
  }

  //continue game
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  return message.reply(
    `${board}\n\n` +
      `Attempts Remaining: **${attemptsRemaining(player.guesses)}**`
  );
}
