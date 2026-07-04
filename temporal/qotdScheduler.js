//daily qotd poster
import cron from 'node-cron';
import { QOTD_CRON_SCHEDULE } from '../constants/env.js';
import { postNextQotd } from '../utils/qotdUtils.js';

//post the qotd
export function startQotdScheduler(client) {
  cron.schedule(QOTD_CRON_SCHEDULE, async () => {
    try {
      await postNextQotd(client);
    } catch (err) {
      console.error('QOTD scheduler error:', err);
    }
  });
}
