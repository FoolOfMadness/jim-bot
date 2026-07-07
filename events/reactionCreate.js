//check and create react messages
import { Events } from 'discord.js';
import {
  loadScranState,
  saveScranState,
  registerScranVote,
  updateScranProfile,
  updateScranLeaderboard,
} from '#utils/scranUtils';

export const name = Events.MessageReactionAdd;

export async function execute(reaction, user) {
  try {
    //ignore bot reactions
    if (user.bot) return;

    if (reaction.partial) {
      await reaction.fetch();
    }

    const message = reaction.message;

    //only scran threads
    if (!message.channel.isThread()) return;

    let value;
    let opposite;

    if (reaction.emoji.name === '👍') {
      value = 1;
      opposite = '👎';
    } else if (reaction.emoji.name === '👎') {
      value = -1;
      opposite = '👍';
    } else {
      return;
    }

    const state = loadScranState();

    //find scran owner
    const ownerId = Object.values(state.users).find(
      (u) => u.threadId === message.channel.id
    )?.userId;
    if (!ownerId) return;

    //remove opposite reaction
    const oppositeReaction = message.reactions.cache.find(
      (r) => r.emoji.name === opposite
    );
    if (oppositeReaction) {
      await oppositeReaction.users.remove(user.id);
    }

    const updated = registerScranVote(
      state,
      message.channel.id,
      message.id,
      user.id,
      value
    );

    if (!updated) return;

    saveScranState(state);

    //update user's scran profile
    await updateScranProfile(message.client, ownerId, state);

    //update leaderboard
    await updateScranLeaderboard(message.client, state);
  } catch (err) {
    console.error('Scran reaction error:', err);
  }
}
