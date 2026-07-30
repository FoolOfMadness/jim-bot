//events for on messageCreate
import { Events, GuildMember } from 'discord.js';
import { extremePunish } from '../commands/mod/punish.js';
import {
  SCRAN_FORUM_CHANNEL_ID,
  CLIENT_ID,
  TRIGGER_EMOJI_ID,
} from '#constants/env';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';
import {
  loadScranState,
  saveScranState,
  registerScranPost,
  updateScranProfile,
} from '#utils/scranUtils';
import { handleWordleMessage } from '#games/wordleMessageHandler';

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
    if (!message?.author) return;

    if (message.author.id === CLIENT_ID) return;

    if (message.author.bot) return;

    //wordle check
    await handleWordleMessage(message).catch(console.error);

    //scran check
    if (message.channel.isThread()) {
      const state = loadScranState();

      const updated = registerScranPost(state, message.channel.id, message);

      if (updated) {
        saveScranState(state);

        await message.react('👍');
        await message.react('👎');

        const ownerId = Object.values(state.users).find(
          (u) => u.threadId === message.channel.id
        )?.userId;

        if (ownerId) {
          await updateScranProfile(message.client, ownerId, state);
        }
      }
    }

    //jimpreg trigger
    if (/(?=.*jim)(?=.*preg)/is.test(message.content)) {
      await message.react(TRIGGER_EMOJI_ID).catch(console.error);
      return;
    }

    if (activePunishments.has(message.author.id)) return;

    //60s
    const PUNISH_DURATION = 60 * 1000;

    for (const element of message.client.bannedWords) {
      const word = Object.values(element)[0];
      if (word.test(message.content)) {
        if (!message.member) break;
        //mark user as being actively punished
        activePunishments.add(message.author.id);
        try {
          await extremePunish(
            message.channel,
            message.member,
            PUNISH_DURATION,
            150
          );
        } finally {
          //remove user from active punishments
          activePunishments.delete(message.author.id);
        }
        break; //punish only once per message
      }
    }
  } catch (error) {
    console.error('Error on messageCreate event: ', error);
  }
}
