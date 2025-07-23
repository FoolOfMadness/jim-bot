import { Events, GuildMember } from 'discord.js';
import { extremePunish } from '../commands/mod/punish.js';

/**
 * @typedef Message
 * @type {object}
 * @property {GuildMember} member
 */

const activePunishments = new Set();
export const name = Events.MessageCreate;

/**
 * @param {Message} message
 */

export async function execute(message) {
  try {
    //check if message, member, or bannedWords are invalid, or if the message is from JimBot
    if (
      !message?.member ||
      message.member.id === process.env.CLIENT_ID ||
      !message.client.bannedWords
    )
      return;

    if (activePunishments.has(message.member.id)) return;

    //60s
    const PUNISH_DURATION = 60 * 1000;

    for (const element of message.client.bannedWords) {
      const word = Object.values(element)[0];
      if (word.test(message.content)) {
        //mark user as being actively punished
        activePunishments.add(message.member.id);
        try {
          await extremePunish(
            message.channel,
            message.member,
            PUNISH_DURATION,
            150
          );
        } finally {
          //remove user from active punishments
          activePunishments.delete(message.member.id);
        }
        break; //punish only once per message
      }
    }
  } catch (error) {
    console.error('Error on messageCreate event: ', error);
  }
}
