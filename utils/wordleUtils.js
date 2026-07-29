//wordle utility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../data/wordleState.json');

//load wordle state
export function loadWordleState() {
  if (!fs.existsSync(statePath)) {
    return {
      wordNumber: 0,
      answer: null,
      activePostId: null,
      players: {},
    };
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

//save wordle state
export function saveWordleState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

//load words
export function loadWords(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((word) => word.trim().toUpperCase())
    .filter(Boolean);
}

//get today's word
export function getDailyWord(words, wordNumber) {
  return words[wordNumber % words.length];
}

//validate guess
export function isValidGuess(word, wordList) {
  return (
    typeof word === 'string' &&
    word.length === 5 &&
    wordList.includes(word.toUpperCase())
  );
}

//check solved
export function isSolved(guess, answer) {
  return guess.toUpperCase() === answer.toUpperCase();
}

//score guess
export function scoreGuess(guess, answer) {
  guess = guess.toUpperCase();
  answer = answer.toUpperCase();

  const result = Array(5).fill('⬛');
  const remaining = [...answer];

  //greens
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = '🟩';
      remaining[i] = null;
    }
  }

  //yellows
  for (let i = 0; i < 5; i++) {
    if (result[i] === '🟩') continue;
    const index = remaining.indexOf(guess[i]);

    if (index !== -1) {
      result[i] = '🟨';
      remaining[index] = null;
    }
  }
  return result;
}

//build player board
export function buildBoard(guesses, answer) {
  return guesses
    .map((guess) => {
      return `${guess}\n` + `${scoreGuess(guess, answer).join('')}`;
    })
    .join('\n\n');
}

//attempts remaining
export function attemptsRemaining(guesses) {
  return Math.max(0, 6 - guesses.length);
}

//result text
export function getResultMessage(guessCount) {
  switch (guessCount) {
    case 1:
      return '💢 Lucky guess...';
    case 2:
      return '🔥 This level of reasoning is possible for the detective. What do you think everyone?';
    case 3:
      return '🎉 <Oh yeah! Very good!>';
    case 4:
      return '✅ Solved in 4, average performance.';
    case 5:
      return '✅ Solved in 5...you can do better.';
    case 6:
      return '✅ Barely made it. Used all 6 guesses.';
    default:
      return '❎❌ Loser!';
  }
}

//build daily leaderboard
export function buildWordleResults(state) {
  const players = Object.values(state.players ?? {});

  const completed = players
    .filter((player) => player.completed)
    .sort((a, b) => a.attempts - b.attempts);

  if (!completed.length) {
    return (
      `# 🟩 Wordle #${state.wordNumber} Results\n\n` +
      'No completed games today.'
    );
  }

  const results = completed.map((player, index) => {
    return (
      `${index + 1}. ` + `${player.username} - ` + `${player.attempts} guesses`
    );
  });

  return (
    `# 🟩 Wordle #${state.wordNumber} Results\n\n` +
    results.join('\n') +
    '\n\n_Updated automatically by JimBot_'
  );

  //log history
  export function saveWordleHistory(state) {
    const historyPath = path.join(__dirname, '../data/wordleHistory.json');

    let history = {};

    if (fs.existsSync(historyPath)) {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
    const results = state.results ?? [];
    const winners = results.filter((player) => player.won);
    const attempts = winners.map((player) => player.attempts);

    history[state.wordNumber] = {
      date: new Date().toISOString().split('T')[0],
      answer: state.answer,
      players: Object.keys(state.players ?? {}).length,
      winners: winners.length,
      averageGuesses: attempts.length
        ? Number(
            (attempts.reduce((a, b) => a + b, 0) / attempts.length).toFixed(2)
          )
        : null,
      bestResult: attempts.length ? Math.min(...attempts) : null,
      results: results.map((player) => ({
        username: player.username,
        attempts: player.attempts,
        won: player.won,
      })),
    };
    //save history
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  }
}
