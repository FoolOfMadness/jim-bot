//qotd scheduler
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  FORUM_CHANNEL_ID,
  QOTD_TAG_ID,
  QOTD_ROLE_ID,
  QOTD_CRON_SCHEDULE,
} from '../constants/env.js';
import { QOTD_IMAGE } from '../constants/assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../utils/qotdState.json');

//resolve image or use default
function resolveImage(image) {
  if (!image) return QOTD_IMAGE;
  if (typeof image === 'string') return image;
  if (image?.url) return image.url;
  return QOTD_IMAGE;
}

//cronjob for configured schedule, default 00:00 UTC
export function startQotdScheduler(client) {
  cron.schedule(QOTD_CRON_SCHEDULE, async () => {
    console.log('🌅 Running QOTD scheduler');

    try {
      //load state safely
      const raw = fs.readFileSync(statePath, 'utf8') || '{}';
      const state = {
        lastQuestionNumber: 0,
        queue: [],
        activeThreadId: null,
        ...JSON.parse(raw),
      };
      state.queue ||= [];

      //fetch forum
      const forum = await client.channels.fetch(FORUM_CHANNEL_ID);
      if (!forum?.threads) {
        console.log('Forum channel not found');
        return;
      }

      //close & lock old thread
      if (state.activeThreadId) {
        try {
          const oldThread = await forum.threads.fetch(state.activeThreadId);
          if (oldThread) {
            const newName = oldThread.name.startsWith('🔒')
              ? oldThread.name
              : `🔒 ${oldThread.name}`;
            await oldThread.setName(newName);
            await oldThread.setLocked(true);
            await oldThread.setArchived(true);
          }
        } catch {
          console.log('Old thread missing or already archived');
        }
      }
      //get next qotd
      const next = state.queue.shift();
      if (!next) {
        console.log('No queued QOTD');
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        return;
      }
      //save immediately
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      //increment qotd number
      state.lastQuestionNumber = (state.lastQuestionNumber || 0) + 1;
      const qNum = state.lastQuestionNumber;
      const image = resolveImage(next.image);

      //clean poll options
      const answers = (next.options || [])
        .map((o) => o?.trim())
        .filter((o) => o && o.length <= 55);

      //create thread
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
            `🪑 **Submitted by:** <@${next.userId}>\n\n` +
            `💬 Reply below with your answer!`,
          files: [image],
        },
      });
      //send poll
      if (answers.length >= 2) {
        await thread.send({
          poll: {
            question: {
              text: next.question.slice(0, 300),
            },
            answers: answers.map((text) => ({ text })),
            duration: 24,
            allowMultiselect: false,
          },
        });
      }
      //save active thread
      state.activeThreadId = thread.id;
      //save incremented number
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      console.log(`Posted QOTD #${qNum}`);
    } catch (err) {
      console.error('QOTD scheduler error:', err);
    }
  });
}
