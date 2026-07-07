//qotd utility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { QOTD_IMAGE } from '#constants/assets';
import {
  QOTD_FORUM_CHANNEL_ID,
  QOTD_TAG_ID,
  QOTD_ROLE_ID,
} from '#constants/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../data/qotdState.json');

//decide which image to use
function resolveImage(image) {
  if (!image) return QOTD_IMAGE;
  if (typeof image === 'string') return image;
  if (image?.url) return image.url;
  return QOTD_IMAGE;
}

//post qotd
export async function postNextQotd(client) {
  console.log('🌅 Running QOTD scheduler');

  const raw = fs.readFileSync(statePath, 'utf8') || '{}';
  //json item
  const state = {
    lastQuestionNumber: 0,
    queue: [],
    activeThreadId: null,
    ...JSON.parse(raw),
  };
  //save
  state.queue ||= [];

  const forum = await client.channels.fetch(QOTD_FORUM_CHANNEL_ID);
  if (!forum?.threads) return;

  //close old thread
  if (state.activeThreadId) {
    try {
      const oldThread = await forum.threads.fetch(state.activeThreadId);
      if (oldThread) {
        await oldThread.setName(`🔒 ${oldThread.name}`);
        await oldThread.setLocked(true);
        await oldThread.setArchived(true);
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: 'Something went wrong while archiving previous QotD...',
        flags: EPHEMERAL_FLAG,
      });
    }
  }
  //move next item
  const next = state.queue.shift();
  if (!next) {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    return;
  }
  //increment
  state.lastQuestionNumber++;
  const qNum = state.lastQuestionNumber;

  const image = resolveImage(next.image);

  const answers = (next.options || [])
    .map((option) => option?.trim())
    .filter((option) => option && option.length <= 55);

  //create post
  const thread = await forum.threads.create({
    name: `Question of the Day #${qNum} • ${
      next.type === 'poll' ? 'Poll' : 'Discussion'
    }`,
    appliedTags: [QOTD_TAG_ID],
    message: {
      content:
        `<@&${QOTD_ROLE_ID}>\n` +
        `# Question of the Day #${qNum}\n\n` +
        `${next.question}\n\n` +
        `🪑 Submitted by: <@${next.userId}>`,
      files: [image],
    },
  });

  //decide if poll
  if (answers.length >= 2) {
    await thread.send({
      poll: {
        question: { text: next.question.slice(0, 300) },
        answers: answers.map((text) => ({ text })),
        duration: 24,
        allowMultiselect: false,
      },
    });
  }
  //save
  state.activeThreadId = thread.id;
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(`Posted QOTD #${qNum}`);
}
