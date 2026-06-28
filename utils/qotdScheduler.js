//qotd scheduler
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../utils/qotdState.json');

//hardcoded shit
const FORUM_CHANNEL_ID = '1284437249739456557';
const QOTD_TAG_ID = '1517977869857591378';
const QOTD_ROLE_ID = '1517982759451103402';
const imagePath = path.join(__dirname, '../commands/utility/qotd.png');

//cronjob for 00:00 UTC
export function startQotdScheduler(client) {
  cron.schedule('0 0 * * *', async () => {
    console.log('🌅 Running QOTD scheduler (00:00 UTC)');

    //load queue & find forum
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8') || '{}');

      state.queue = state.queue || [];

      const forum = client.channels.cache.get(FORUM_CHANNEL_ID);
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

      //save queue
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      //increment number
      state.lastQuestionNumber = (state.lastQuestionNumber || 0) + 1;
      const qNum = state.lastQuestionNumber;

      //create thread
      const thread = await forum.threads.create({
        name: `Question of the Day #${qNum} • ${next.type === 'poll' ? 'Poll' : 'Discussion'}`,
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
            answers: next.options.map((o) => ({ text: o })),
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
