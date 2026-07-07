//scran utility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';
import { SCRAN_FORUM_CHANNEL_ID, SCRAN_TAG_ID } from '#constants/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scranStatePath = path.join(__dirname, '../data/scranState.json');

//load state
export function loadScranState() {
  if (!fs.existsSync(scranStatePath)) {
    return {
      users: {},
    };
  }
  return JSON.parse(fs.readFileSync(scranStatePath, 'utf8'));
}

//save state
export function saveScranState(state) {
  fs.writeFileSync(scranStatePath, JSON.stringify(state, null, 2));
}

//create user's forum post
export async function createScranThread(client, user) {
  const forum = await client.channels.fetch(SCRAN_FORUM_CHANNEL_ID);

  const profile = {
    score: 0,
    posts: 0,
  };
  const embed = buildScranProfileEmbed(user.id, profile, user);

  const thread = await forum.threads.create({
    name: `🍔 ${user.displayName} Scran`,
    appliedTags: [SCRAN_TAG_ID],
    message: {
      embeds: [embed],
      content:
        `Drop your food pics below and let the council decide 🪑\n\n` +
        `👍 = Tasty\n` +
        `👎 = Questionable`,
    },
  });
  const message = await thread.fetchStarterMessage();

  return {
    thread,
    message,
  };
}

//build profile embed
export function buildScranProfileEmbed(userId, profile, user) {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(`🍔 ${user.displayName} Scran`)
    .setThumbnail(user.displayAvatarURL())
    .setDescription(`🌭 Scran Stats for <@${userId}>`)
    .addFields(
      {
        name: '⭐ Score',
        value: `${profile.score ?? 0}`,
        inline: true,
      },
      {
        name: '🍴 Posts',
        value: `${profile.posts ?? 0}`,
        inline: true,
      }
    )
    .setTimestamp();
}

//get profile
export function getScranProfile(state, userId) {
  return state.users[userId] ?? null;
}

//update profile message
export async function updateScranProfile(client, userId, state) {
  const profile = state.users[userId];

  if (!profile) return;

  const thread = await client.channels.fetch(profile.threadId);

  const message = await thread.messages.fetch(profile.profileMessageId);

  const user = await client.users.fetch(userId);

  const embed = buildScranProfileEmbed(userId, profile, user);

  await message.edit({
    embeds: [embed],
  });
}

//register a vote
export function registerVote(state, ownerId, voterId, value) {
  const profile = state.users[ownerId];

  if (!profile) return false;

  if (!profile.votes) {
    profile.votes = {};
  }
  const previous = profile.votes[voterId] ?? 0;

  //remove previous vote
  profile.score -= previous;

  //apply new vote
  profile.score += value;

  profile.votes[voterId] = value;

  return true;
}

//register a new scran
export function registerScranPost(state, threadId, message) {
  const userEntry = Object.values(state.users).find(
    (user) => user.threadId === threadId
  );
  if (!userEntry) return false;

  //only count the owner
  if (message.author.id !== userEntry.userId) {
    return false;
  }

  //only count image posts
  const hasImage = [...message.attachments.values()].some((attachment) =>
    attachment.contentType?.startsWith('image/')
  );

  if (!hasImage) {
    return false;
  }

  if (!userEntry.messages) {
    userEntry.messages = {};
  }
  userEntry.posts++;

  userEntry.messages[message.id] = {
    score: 0,
    votes: {},
  };
  return true;
}

//register a scran vote
export function registerScranVote(state, threadId, messageId, voterId, value) {
  const userEntry = Object.values(state.users).find(
    (user) => user.threadId === threadId
  );
  if (!userEntry) return false;

  const post = userEntry.messages?.[messageId];

  //not a registered scran image post
  if (!post) return false;

  if (!post.votes) {
    post.votes = {};
  }
  const previous = post.votes[voterId] ?? 0;

  //remove previous vote
  post.score -= previous;
  userEntry.score -= previous;

  //apply new vote
  post.score += value;
  userEntry.score += value;

  post.votes[voterId] = value;

  return true;
}

//leaderboard content
export function buildScranLeaderboardMessage(state) {
  const users = Object.values(state.users);

  //check if no scrans
  if (!users.length) {
    return '# 🏆 Scran Leaderboard\n\n' + 'No scrans yet 🍔';
  }

  const sorted = [...users].sort((a, b) => b.score - a.score);

  const best = sorted.slice(0, 5);
  const worst = [...sorted].reverse().slice(0, 5);

  return (
    '# 🏆 Scran Leaderboard\n\n' +
    '## 🔥 Top Scrans\n' +
    (best
      .map((u, i) => `${i + 1}. <@${u.userId}> — ⭐ ${u.score}`)
      .join('\n') || 'None') +
    '\n\n' +
    '## 💀 Worst Scrans\n' +
    (worst
      .map((u, i) => `${i + 1}. <@${u.userId}> — ⭐ ${u.score}`)
      .join('\n') || 'None') +
    '\n\n_Updated automatically by JimBot 🍔_' +
    '\nUse `/scran start` to make your own scran thread!'
  );
}

//create the leaderboard
export async function createScranLeaderboard(client, state) {
  const forum = await client.channels.fetch(SCRAN_FORUM_CHANNEL_ID);

  const thread = await forum.threads.create({
    name: '🏆 Scran Leaderboard',
    appliedTags: [SCRAN_TAG_ID],
    message: {
      content: buildScranLeaderboardMessage(state),
    },
  });
  const message = await thread.fetchStarterMessage();

  state.leaderboardThreadId = thread.id;
  state.leaderboardMessageId = message.id;

  await thread.pin();

  return {
    thread,
    message,
  };
}

//update the leaderboard
export async function updateScranLeaderboard(client, state) {
  if (!state.leaderboardThreadId) return;

  const thread = await client.channels.fetch(state.leaderboardThreadId);

  const message = await thread.fetchStarterMessage();

  await message.edit({
    content: buildScranLeaderboardMessage(state),
  });
}
