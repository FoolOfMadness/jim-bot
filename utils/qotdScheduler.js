//qotd scheduler
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  QOTD_FORUM_CHANNEL_ID,
  QOTD_TAG_ID,
  QOTD_ROLE_ID,
  QOTD_CRON_SCHEDULE,
} from '../constants/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../utils/qotdState.json');
const imagePath = path.join(__dirname, '../commands/utility/qotd.png');

//cronjob for configured schedule, default 00:00 UTC
export function startQotdScheduler(client) {
  cron.schedule(QOTD_CRON_SCHEDULE, async () => {
    console.log('🌅 Running QOTD scheduler');

    try {
      //load queue & find forum
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8') || '{}');

      state.queue = state.queue || [];

      const forum = client.channels.cache.get(QOTD_FORUM_CHANNEL_ID);
      if (!forum || !forum.threads) return;

      //close previous qotd
      if (state.activeThreadId) {
        try {
          const oldThread = await forum.threads.fetch(state.activeThreadId);

          if (oldThread) {
            //lock & archive
            if (!oldThread.name.startsWith('🔒')) {
              await oldThread.setName(`🔒 ${oldThread.name}`);
            }

            await oldThread.setLocked(true);
            await oldThread.setArchived(true);
          }
        } catch {
          console.log('Old thread missing or already archived');
        }
      }

      //shift next qotd from json
      const next = state.queue.shift();

      if (!next) {
        console.log('No queued QOTD');
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
        return;
      }

      //increment number
      state.lastQuestionNumber = (state.lastQuestionNumber || 0) + 1;
      const qNum = state.lastQuestionNumber;

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
          files: [imagePath],
        },
      });

      //poll if needed
      if (next.options?.length >= 2) {
        await thread.send({
          poll: {
            question: { text: next.question },
            answers: next.options.map((option) => ({ text: option })),
            duration: 24,
            allowMultiselect: false,
          },
        });
      }

      //update threadID & save
      state.activeThreadId = thread.id;
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      console.log(`Posted QOTD #${qNum}`);
    } catch (err) {
      console.error('QOTD scheduler error:', err);
    }
  });
}
