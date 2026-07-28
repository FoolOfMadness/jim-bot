//wordle message handler
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

const statsPath = path.join(__dirname, '../../data/wordleStats.json');

const wordsPath = path.join(__dirname, '../../data/words.txt');

export async function handleWordleMessage(message) {
  if (message.author.bot) return;

  if (!fs.existsSync(statePath)) return;

  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

  const player = state.players?.[message.author.id];

  if (!player) return;

  if (message.channel.id !== player.threadId) return;

  if (player.completed) return;

  const guess = message.content.trim().toUpperCase();

  const words = loadWords(wordsPath);

  if (!isValidGuess(guess, words)) {
    return message.reply('❌ Please enter a valid 5-letter word.');
  }

  player.guesses.push(guess);

  const solved = guess === state.answer.toUpperCase();

  const board = buildBoard(player.guesses, state.answer);

  //win
  if (solved) {
    player.completed = true;
    player.attempts = player.guesses.length;
    player.completedAt = Date.now();

    let stats = {};

    if (fs.existsSync(statsPath)) {
      stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    }

    stats[message.author.id] ??= {
      username: message.author.username,
      wins: 0,
      gamesPlayed: 0,
      streak: 0,
      best: null,
      totalGuesses: 0,
    };

    stats[message.author.id].username = message.author.username;

    stats[message.author.id].wins++;
    stats[message.author.id].gamesPlayed++;
    stats[message.author.id].streak++;
    stats[message.author.id].totalGuesses += player.guesses.length;

    if (
      stats[message.author.id].best === null ||
      player.guesses.length < stats[message.author.id].best
    ) {
      stats[message.author.id].best = player.guesses.length;
    }

    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    return message.reply(
      `${board}\n\n${getResultMessage(player.guesses.length)}`
    );
  }

  //lose
  if (player.guesses.length >= 6) {
    player.completed = true;
    player.failed = true;

    let stats = {};

    if (fs.existsSync(statsPath)) {
      stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    }

    stats[message.author.id] ??= {
      username: message.author.username,
      wins: 0,
      gamesPlayed: 0,
      streak: 0,
      best: null,
      totalGuesses: 0,
    };

    stats[message.author.id].username = message.author.username;

    stats[message.author.id].gamesPlayed++;
    stats[message.author.id].streak = 0;

    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    return message.reply(
      `${board}\n\n❌ You ran out of guesses.\nThe answer was **${state.answer}**.`
    );
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  return message.reply(
    `${board}\n\nAttempts Remaining: **${attemptsRemaining(player.guesses)}**`
  );
}
