//wordle scheduler
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import {
  WORDLE_FORUM_CHANNEL_ID,
  WORDLE_TAG_ID,
  WORDLE_ROLE_ID,
} from '#constants/env';
import {
  loadWordleState,
  saveWordleState,
  saveWordleHistory,
  getDailyWord,
  loadWords,
  buildWordleResults,
} from '#utils/wordleUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const wordsPath = path.join(__dirname, '../data/words.txt');

//create daily wordle
export async function postDailyWordle(client) {
  console.log('🟩 Running Wordle scheduler');
  const state = loadWordleState();

  //close previous wordle
  if (state.activePostId) {
    try {
      const forum = await client.channels.fetch(WORDLE_FORUM_CHANNEL_ID);
      const oldPost = await forum.threads.fetch(state.activePostId);

      if (oldPost) {
        //build final results
        const results = buildWordleResults(state);

        //save previous wordle to history
        saveWordleHistory(state);

        //update previous post with results
        const starter = await oldPost.fetchStarterMessage();
        await starter.edit({
          content: results,
          components: [],
        });

        //archive player threads
        for (const player of Object.values(state.players ?? {})) {
          try {
            const thread = await client.channels.fetch(player.threadId);

            await thread.setLocked(true);
            await thread.setArchived(true);
          } catch {}
        }
        //lock & archive previous post
        await oldPost.setName(`🔒 Wordle #${state.wordNumber} Results`);
        await oldPost.setLocked(true);
        await oldPost.setArchived(true);
      }
    } catch (err) {
      console.error('Failed to close previous Wordle:', err);
    }
  }
  //create new wordle
  state.wordNumber = (state.wordNumber ?? 0) + 1;
  const words = loadWords(wordsPath);
  state.answer = getDailyWord(words, state.lastWord);
  state.lastWord = state.answer;
  const wordLengthDisplay = '⬜'.repeat(state.answer.length);

  //reset players
  state.players = {};
  const forum = await client.channels.fetch(WORDLE_FORUM_CHANNEL_ID);

  const button = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('wordle_start')
      .setLabel('🎮 Start Wordle')
      .setStyle(ButtonStyle.Success)
  );

  const thread = await forum.threads.create({
    name: `Wordle #${state.wordNumber}`,
    appliedTags: [WORDLE_TAG_ID],
    message: {
      content:
        `<@&${WORDLE_ROLE_ID}>\n\n` +
        `# 🟩 Daily Wordle #${state.wordNumber}\n\n` +
        `Today's word:\n${wordLengthDisplay}\n\n` +
        `(${state.answer.length} letters)\n\n` +
        `You have 6 attempts.\n\n` +
        `Click below to start your private game.`,
      components: [button],
    },
  });
  //save active post
  state.activePostId = thread.id;
  saveWordleState(state);
  console.log(`Posted Wordle #${state.wordNumber}`);
}
