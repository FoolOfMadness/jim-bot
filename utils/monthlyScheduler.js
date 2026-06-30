//monthly post scheduler
import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { MONTHLY_CHANNEL_ID } from '../constants/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//first
const VIDEO_PATH = path.join(__dirname, 'firstlei.mp4');

const CRON = '0 0 1 * *';

//post the video on the first of each month at 00:00 UTC
export function startMonthlyScheduler(client) {
  cron.schedule(CRON, async () => {
    console.log('🎬 Running Monthly Scheduler');

    try {
      const channel = await client.channels.fetch(MONTHLY_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: "@everyone **Wake up! It's the first of the month!**",
        allowedMentions: { parse: ['everyone'] },
        files: [VIDEO_PATH],
      });

      console.log('Monthly video posted');
    } catch (err) {
      console.error('Monthly video scheduler error:', err);
    }
  });
}
