//monthly post scheduler
import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { MONTHLY_CHANNEL_ID, MONTHLY_CRON_SCHEDULE } from '../constants/env.js';
import { MONTHLY_VIDEO } from '../constants/assets.js';

//post the video
export function startMonthlyScheduler(client) {
  cron.schedule(MONTHLY_CRON_SCHEDULE, async () => {
    console.log('📅 Running Monthly Scheduler');

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
