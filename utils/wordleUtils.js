//wordle utility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WORDLE_FORUM_CHANNEL_ID, WORDLE_TAG_ID } from '#constants/env';
import { EmbedBuilder } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../data/wordleState.json');
const wordsPath = path.join(__dirname, '../data/words.txt');

//load wordle state
export function loadWordleState() {
  if (!fs.existsSync(statePath)) {
    return {
      wordNumber: 0,
      answer: null,
      lastWord: null,
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
    .filter(
      (word) => /^[A-Z]+$/.test(word) && word.length >= 3 && word.length <= 8
    );
}

//get today's word
export function getDailyWord(words, lastWord = null) {
  let selectedWord;
  do {
    const randomIndex = Math.floor(Math.random() * words.length);
    selectedWord = words[randomIndex];
  } while (words.length > 1 && selectedWord === lastWord);
  return selectedWord;
}

//load words
export function loadWordleWords() {
  return loadWords(wordsPath);
}

//check solved
export function isSolved(guess, answer) {
  return guess.toUpperCase() === answer.toUpperCase();
}

//clean display name
export function cleanDisplayName(member, fallback) {
  return (member?.displayName ?? fallback)
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim();
}

//word display
export function getWordDisplay(answer) {
  return '⬜'.repeat(answer.length);
}

//validate guess
export function isValidGuess(word, answer, wordList) {
  const guess = word.trim().toUpperCase();

  return guess.length === answer.length && wordList.includes(guess);
}

//score guess
export function scoreGuess(guess, answer) {
  guess = guess.toUpperCase();
  answer = answer.toUpperCase();

  const wordLength = answer.length;
  const result = Array(wordLength).fill('⬛');
  const remaining = [...answer];

  //greens
  for (let i = 0; i < wordLength; i++) {
    if (guess[i] === answer[i]) {
      result[i] = '🟩';
      remaining[i] = null;
    }
  }
  //yellows
  for (let i = 0; i < wordLength; i++) {
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
      return '❎ Loser!';
  }
}

//build daily leaderboard
export function buildFinalWordleResults(state) {
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
    return `${index + 1}. <@${player.userId}> - ${
      player.failed ? '❌ Failed' : `${player.attempts} guesses`
    }`;
  });

  return (
    `# 🟩 Wordle #${state.wordNumber} Results\n\n` +
    results.join('\n') +
    '\n\n_Updated automatically by JimBot_'
  );
}

//daily leaderboard
export function buildDailyWordleLeaderboard(state) {
  const players = Object.values(state.players ?? {});

  const completed = players
    .filter((player) => player.completed)
    .sort((a, b) => {
      if (a.failed && !b.failed) return 1;
      if (!a.failed && b.failed) return -1;

      return a.attempts - b.attempts;
    });

  const results = completed.map((player, index) => {
    const result = player.failed ? '❌ Failed' : `🟩 ${player.attempts}`;

    return `${index + 1}. <@${player.userId ?? player.id}> - ${result}`;
  });

  return (
    `# 🟩 Daily Wordle #${state.wordNumber}\n\n` +
    `Today's word:\n${'⬜'.repeat(state.answer.length)}\n\n` +
    `(${state.answer.length} letters)\n\n` +
    `🏆 Today's Results\n\n` +
    (results.length ? results.join('\n') : 'No completed games yet.') +
    '\n\nClick below to start your private game.'
  );
}

//create wordle leaderboard
export async function createWordleLeaderboard(client) {
  const forum = await client.channels.fetch(WORDLE_FORUM_CHANNEL_ID);

  const thread = await forum.threads.create({
    name: '🏆 Wordle Leaderboard',
    appliedTags: [WORDLE_TAG_ID],
    message: {
      content:
        '# 🏆 Wordle Leaderboard\n\n' +
        'No games completed yet.\n\n' +
        '_Updated automatically by JimBot 🟩_',
    },
  });
  const message = await thread.fetchStarterMessage();

  await thread.pin();

  return {
    thread,
    message,
  };
}

//create player state
export function createPlayerState({
  interaction,
  threadId,
  messageId,
  displayName,
  wordNumber,
}) {
  return {
    userId: interaction.user.id,
    username: interaction.user.username,
    displayName,
    threadId,
    messageId,
    wordNumber,
    guesses: [],
    completed: false,
    failed: false,
    attempts: null,
    startedAt: Date.now(),
  };
}

//update leaderboard
export async function updateWordleLeaderboard(client, state) {
  if (!state.leaderboardThreadId || !state.leaderboardMessageId) {
    console.log('Wordle leaderboard not configured. Skipping update.');
    return;
  }
  try {
    const thread = await client.channels.fetch(state.leaderboardThreadId);
    const message = await thread.messages.fetch(state.leaderboardMessageId);

    const historyPath = path.join(__dirname, '../data/wordleHistory.json');

    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath, 'utf8'))
      : {};

    await message.edit({
      content: buildWordleLeaderboard(history),
    });
  } catch (err) {
    console.error('Wordle leaderboard update failed:', err.message);

    //clear invalid references
    state.leaderboardThreadId = null;
    state.leaderboardMessageId = null;
    saveWordleState(state);
  }
}

//update history
export function updateWordleHistoryEntry(state) {
  const historyPath = path.join(__dirname, '../data/wordleHistory.json');

  let history = {};

  if (fs.existsSync(historyPath)) {
    history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  }

  const results = Object.values(state.results ?? {});

  history[state.wordNumber] ??= {
    date: new Date().toISOString().split('T')[0],
    answer: state.answer,
    players: 0,
    winners: 0,
    bestResult: null,
    results: [],
  };

  history[state.wordNumber].results = results.map((player) => ({
    userId: player.userId,
    username: player.username,
    attempts: player.attempts,
    won: player.won,
  }));

  history[state.wordNumber].players = Object.keys(state.players ?? {}).length;

  history[state.wordNumber].winners = results.filter((p) => p.won).length;

  history[state.wordNumber].bestResult = results.length
    ? Math.min(...results.map((p) => p.attempts))
    : null;

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
}

//update daily post
export async function updateDailyWordlePost(client, state) {
  if (!state.activePostId) return;

  const forum = await client.channels.fetch(WORDLE_FORUM_CHANNEL_ID);

  const thread = await forum.threads.fetch(state.activePostId);

  const starter = await thread.fetchStarterMessage();

  await starter.edit({
    content: buildDailyWordleLeaderboard(state),
    components: starter.components,
  });
}

//global leaderboard
export function buildWordleLeaderboard(history) {
  const players = {};

  Object.values(history).forEach((day) => {
    for (const result of day.results ?? []) {
      if (!players[result.userId]) {
        players[result.userId] = {
          userId: result.userId,
          completed: 0,
          failed: 0,
          guesses: [],
        };
      }

      if (result.won) {
        players[result.userId].completed++;
        players[result.userId].guesses.push(result.attempts);
      } else {
        players[result.userId].failed++;
      }
    }
  });

  const leaderboard = Object.values(players)
    .map((player) => ({
      ...player,
      games: player.completed + player.failed,
      successRate:
        (player.completed / (player.completed + player.failed)) * 100,
      average: player.guesses.length
        ? player.guesses.reduce((a, b) => a + b, 0) / player.guesses.length
        : 6,
      best: player.guesses.length ? Math.min(...player.guesses) : 6,
    }))
    .sort((a, b) => {
      //wins
      if (b.completed !== a.completed) return b.completed - a.completed;

      //success rate
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;

      //average
      if (a.average !== b.average) return a.average - b.average;

      //best game
      return a.best - b.best;
    });

  if (!leaderboard.length) {
    return '# 🏆 Wordle Leaderboard\n\nNo completed games yet.';
  }

  const results = leaderboard.map((player, index) => {
    return (
      `${index + 1}. <@${player.userId}> - ` +
      `${player.completed}W-${player.failed}L ` +
      `(${player.games} games) | ` +
      `${player.successRate.toFixed(1)}% success | ` +
      `Avg: ${player.average.toFixed(2)} | ` +
      `Best: ${player.best}`
    );
  });

  return (
    '# 🏆 Wordle Leaderboard\n\n' +
    results.join('\n') +
    '\n\n_Updated automatically by JimBot 🟩_'
  );
}

//embed game
export function buildWordleEmbed(state, player) {
  const board = buildBoard(player.guesses, state.answer);

  return new EmbedBuilder()
    .setTitle(`🎮 Daily Wordle #${state.wordNumber}`)
    .setDescription(
      [
        `\`${board || '⬜'.repeat(state.answer.length)}\``,
        '',
        `Attempts Remaining: **${attemptsRemaining(player.guesses)}**`,
      ].join('\n')
    )
    .setColor(player.completed ? 'Gold' : 'Green');
}
