//delete message on event
import { Events } from 'discord.js';
import {
  loadScranState,
  saveScranState,
  unregisterScranPost,
  updateScranProfile,
  updateScranLeaderboard,
} from '#utils/scranUtils';

export const name = Events.MessageDelete;

//update scran if scran deleted
export async function execute(message) {
  if (!message.channel?.isThread()) return;

  const state = loadScranState();

  const ownerId = unregisterScranPost(state, message.channel.id, message.id);

  if (!ownerId) return;

  saveScranState(state);

  await updateScranProfile(message.client, ownerId, state);

  await updateScranLeaderboard(message.client, state);
}
