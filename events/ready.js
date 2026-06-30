//confirm bot ready status
import { Events } from 'discord.js';
import { startQotdScheduler } from '../utils/qotdScheduler.js';
import { startMonthlyScheduler } from '../utils/monthlyScheduler.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client) {
  await client.bannedTable.sync();

  let bannedWords = await client.bannedTable.findAll({
    attributes: ['regex', 'word'],
  });

  bannedWords = bannedWords.map((w) => {
    return {
      [w.word]: new RegExp(w.regex, 'i'),
    };
  });
  client.bannedWords = bannedWords;

  startQotdScheduler(client);
  startMonthlyScheduler(client);

  console.log(`Ready! Logged in as ${client.user.tag}`);
}
