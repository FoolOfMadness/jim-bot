//todo utility
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TODO_IMAGE, MEDIA_IMAGE } from '#constants/assets';
import { TODO_FORUM_CHANNEL_ID, TODO_TAG_ID } from '#constants/env';

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
      listMessageIds: [],
      completedLogMessageIds: [],
      lastTaskId: 0,
      tasks: [],
    };
  }
  const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!state.listMessageIds) {
    state.listMessageIds = state.messageId ? [state.messageId] : [];
  }
  if (!state.completedLogMessageIds) {
    state.completedLogMessageIds = state.completedLogMessageID
      ? [state.completedLogMessageID]
      : [];
  }
  return state;
}

//save
export function saveState(filePath, state) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

//split completed tasks
export function splitMessage(text, limit = 2000) {
  const chunks = [];
  let current = '';

  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > limit) {
      chunks.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current.length) {
    chunks.push(current);
  }
  return chunks;
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
    const chunks = splitMessage(renderList(state.tasks, config));

    const thread = await forum.threads.create({
      name: config.threadName,
      appliedTags: [TODO_TAG_ID],
      message: {
        content: chunks[0],
        files: [config.image],
      },
    });
    state.threadId = thread.id;

    const starter = await thread.fetchStarterMessage();

    state.listMessageIds = [starter.id];

    for (const chunk of chunks.slice(1)) {
      const msg = await thread.send(chunk);
      state.listMessageIds.push(msg.id);
    }
    state.messageId = starter.id;

    saveState(config.statePath, state);

    return thread;
  }
  const thread = await forum.threads.fetch(state.threadId);
  const msg = await thread.messages.fetch(state.messageId);

  const content = renderList(state.tasks, config);
  const chunks = splitMessage(content);

  const existingMessages = [];

  for (const id of state.listMessageIds ?? []) {
    try {
      const message = await thread.messages.fetch(id);
      existingMessages.push(message);
    } catch (error) {
      console.log('Completed message split failure: ' + error);
    }
  }
  //edit existing messages
  for (let i = 0; i < chunks.length; i++) {
    if (existingMessages[i]) {
      await existingMessages[i].edit(chunks[i]);
    } else {
      const msg = await thread.send(chunks[i]);
      existingMessages.push(msg);
    }
  }
  //delete leftovers
  for (let i = chunks.length; i < existingMessages.length; i++) {
    await existingMessages[i].delete();
  }
  //save message IDs
  state.listMessageIds = existingMessages
    .slice(0, chunks.length)
    .map((m) => m.id);

  state.messageId = state.listMessageIds[0];

  saveState(config.statePath, state);

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

  const chunks = splitMessage(content);

  const existingMessages = [];

  for (const id of state.completedLogMessageIds ?? []) {
    try {
      const message = await thread.messages.fetch(id);
      existingMessages.push(message);
    } catch (error) {
      console.log('Completed log message missing: ' + error);
    }
  }
  //edit existing messages or create new ones
  for (let i = 0; i < chunks.length; i++) {
    if (existingMessages[i]) {
      await existingMessages[i].edit(chunks[i]);
    } else {
      const msg = await thread.send(chunks[i]);
      existingMessages.push(msg);
    }
  }
  //delete unused old messages
  for (let i = chunks.length; i < existingMessages.length; i++) {
    await existingMessages[i].delete();
  }
  state.completedLogMessageIds = existingMessages
    .slice(0, chunks.length)
    .map((m) => m.id);

  state.completedLogMessageID = state.completedLogMessageIds[0];

  saveState(config.statePath, state);

  return existingMessages[0];
}
