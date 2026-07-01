//monthly post scheduler
import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { MONTHLY_CHANNEL_ID } from '../constants/env.js';
import { MONTHLY_VIDEO } from '../constants/assets.js';

//first day of each month at 00:00 UTC
const CRON = '0 0 1 * *';

//post the video
export function startMonthlyScheduler(client) {
  cron.schedule(CRON, async () => {
    console.log('🎬 Running Monthly Scheduler');

    try {
      const channel = await client.channels.fetch(MONTHLY_CHANNEL_ID);
      if (!channel) return;

      await channel.send({
        content: "@everyone **Wake up! It's the first of the month!**",
        allowedMentions: { parse: ['everyone'] },
        files: [MONTHLY_VIDEO],
      });

      console.log('Monthly video posted');
    } catch (err) {
      console.error('Monthly video scheduler error:', err);
    }
  });
}
