//todo utility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TODO_FORUM_CHANNEL_ID, TODO_TAG_ID } from '../constants/env.js';
import { TODO_IMAGE, MEDIA_IMAGE } from '../constants/assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//config
export const TODO_CONFIG = {
  todo: {
    statePath: path.join(__dirname, '../data/todoState.json'),
    title: "Jim's To-Do List",
    threadName: "📋 Jim's To-Do List",
    emoji: '📋',
    image: TODO_IMAGE,
  },
  media: {
    statePath: path.join(__dirname, '../data/mediaState.json'),
    title: "Jim's Media List",
    threadName: "🎬 Jim's Watch List",
    emoji: '🎬',
    image: MEDIA_IMAGE,
  },
};

//load
export function loadState(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      threadId: null,
      messageId: null,
      lastTaskId: 0,
      tasks: [],
    };
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

//save
export function saveState(filePath, state) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

//link/embed checker
export function containsLink(text) {
  const patterns = [
    /https?:\/\/\S+/i,
    /www\.\S+/i,
    /discord\.gg\/\S+/i,
    /discord(?:app)?\.com\/invite\/\S+/i,
    /cdn\.discordapp\.com\/\S+/i,
    /media\.discordapp\.net\/\S+/i,
  ];
  return patterns.some((r) => r.test(text));
}

//render list
export function renderList(tasks, config) {
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  let out = `# ${config.emoji} ${config.title}\n\n`;

  out += `## Pending\n\n`;
  if (!pending.length) out += `_None_\n\n`;

  for (const t of pending) {
    out += `⬜ #${t.id} • ${t.text} (by <@${t.userId ?? t.completedBy ?? 'unknown'}>)\n`;
  }
  return out;
}

//update thread, post new if none
export async function upsertThread(client, state, config) {
  const forum = await client.channels.fetch(TODO_FORUM_CHANNEL_ID);

  if (!state.threadId) {
    const thread = await forum.threads.create({
      name: config.threadName,
      appliedTags: [TODO_TAG_ID],
      message: {
        content: renderList(state.tasks, config),
        files: [config.image],
      },
    });
    state.threadId = thread.id;

    const msg = await thread.fetchStarterMessage();
    state.messageId = msg.id;

    return thread;
  }
  const thread = await forum.threads.fetch(state.threadId);
  const msg = await thread.messages.fetch(state.messageId);

  await msg.edit(renderList(state.tasks, config));
  return thread;
}

//completed items log message
export async function upsertCompletedLog(client, state, config, type) {
  const forum = await client.channels.fetch(TODO_FORUM_CHANNEL_ID);
  const thread = await forum.threads.fetch(state.threadId);

  const items = state.tasks.filter((t) => t.done);

  const title = type === 'media' ? '🎬 Media Added' : '📋 Completed Tasks';

  const content =
    items.length === 0
      ? `_None yet_`
      : `# ${title}\n\n` +
        items
          .map(
            (t) =>
              `✅ #${t.id} • ${t.text} (by <@${t.userId ?? t.completedBy ?? 'unknown'}>)`
          )
          .join('\n');

  //edit existing message
  if (state.completedLogMessageID) {
    const msg = await thread.messages.fetch(state.completedLogMessageID);
    await msg.edit(content);
    return msg;
  }

  //create once
  const msg = await thread.send({ content });

  //save log message id
  state.completedLogMessageID = msg.id;
  saveState(config.statePath, state);

  return msg;
}
