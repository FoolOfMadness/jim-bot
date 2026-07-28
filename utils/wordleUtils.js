//wordle utilities
import fs from 'fs';

export function loadWords(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean);
}

export function isValidGuess(word, wordList) {
  return (
    typeof word === 'string' &&
    word.length === 5 &&
    wordList.includes(word.toUpperCase())
  );
}

export function isSolved(guess, answer) {
  return guess.toUpperCase() === answer.toUpperCase();
}

export function scoreGuess(guess, answer) {
  guess = guess.toUpperCase();
  answer = answer.toUpperCase();

  const result = Array(answer.length).fill('⬛');
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

export function buildBoard(guesses, answer) {
  return guesses
    .map((guess) => {
      const score = scoreGuess(guess, answer).join('');

      return `${guess}\n${score}`;
    })
    .join('\n\n');
}

export function attemptsRemaining(guesses) {
  return Math.max(0, 6 - guesses.length);
}

export function getResultMessage(guessCount) {
  switch (guessCount) {
    case 1:
      return '🤯 Incredible! Solved in 1 guess!';
    case 2:
      return '🔥 Amazing! Solved in 2 guesses!';
    case 3:
      return '🎉 Great job! Solved in 3 guesses!';
    case 4:
      return '✅ Solved in 4 guesses!';
    case 5:
      return '✅ Solved in 5 guesses!';
    case 6:
      return '✅ Solved on the final attempt!';
    default:
      return '✅ Solved!';
  }
}

export function getDailyWord(words, wordNumber) {
  return words[wordNumber % words.length];
}
