//events for on messageCreate
import { Events, GuildMember } from 'discord.js';
import { extremePunish } from '../commands/mod/punish.js';
import { JIMPREG_IMAGE } from '#constants/assets';
import { SCRAN_FORUM_CHANNEL_ID, CLIENT_ID } from '#constants/env';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';
import {
  loadScranState,
  saveScranState,
  registerScranPost,
  updateScranProfile,
} from '#utils/scranUtils';

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
    if (!message?.member) return;

    if (message.member.id === CLIENT_ID) return;

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
      const reply = await message.reply({
        files: [JIMPREG_IMAGE],
      });
      //delete 4s
      setTimeout(() => {
        reply.delete().catch(() => {});
      }, 4000);
      return;
    }

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
