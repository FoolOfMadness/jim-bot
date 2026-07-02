//todo command
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SlashCommandBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';
import {
  FORUM_CHANNEL_ID,
  BOT_OWNER_ID,
  TODO_TAG_ID,
} from '../../constants/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../../data/todoState.json');

//load list
function loadState() {
  if (!fs.existsSync(statePath)) {
    return {
      threadId: null,
      messageId: null,
      lastTaskId: 0,
      tasks: [],
    };
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

//save list
function saveState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

//todo list
function renderTodo(tasks) {
  let text = '# 📋 Server To-Do List\n\n';
  text += 'Use `/todo add` to suggest new tasks.\n\n';
  if (!tasks.length) {
    text += '_No tasks currently._';
    return text;
  }
  for (const task of tasks) {
    if (task.done) {
      text +=
        `✅ ~~#${task.id} • ${task.text}~~\n` +
        `Suggested by <@${task.userId}>\n\n`;
    } else {
      text +=
        `⬜ #${task.id} • ${task.text}\n` +
        `Suggested by <@${task.userId}>\n\n`;
    }
  }
  return text;
}

//update thread
async function updateTodoThread(client, state) {
  const forum = await client.channels.fetch(FORUM_CHANNEL_ID);

  if (!forum) return;
  let thread;

  if (!state.threadId) {
    thread = await forum.threads.create({
      name: "📋 Jim's To-Do List",
      appliedTags: [TODO_TAG_ID],
      message: {
        content: renderTodo(state.tasks),
      },
    });
    state.threadId = thread.id;
    const starter = await thread.fetchStarterMessage();
    state.messageId = starter.id;
    saveState(state);
    return;
  }
  thread = await forum.threads.fetch(state.threadId);
  const message = await thread.messages.fetch(state.messageId);
  await message.edit(renderTodo(state.tasks));
}

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('todo')
  .setDescription('Manage the server to-do list')
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Add a task')
      .addStringOption((option) =>
        option.setName('task').setDescription('Task to add').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('complete')
      .setDescription('Mark a task complete')
      .addIntegerOption((option) =>
        option.setName('id').setDescription('Task ID').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('View the to-do list')
  );

//todo
export async function execute(interaction) {
  const state = loadState();

  const sub = interaction.options.getSubcommand();

  if (sub === 'add') {
    const text = interaction.options.getString('task').trim();

    state.tasks.push({
      id: ++state.lastTaskId,
      text,
      userId: interaction.user.id,
      username: interaction.user.tag,
      done: false,
      createdAt: Date.now(),
    });
    saveState(state);
    await updateTodoThread(interaction.client, state);

    return interaction.reply({
      content: '✅ Task added to the to-do list.',
      flags: EPHEMERAL_FLAG,
    });
  }

  if (sub === 'complete') {
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({
        content: '❌ Only Jim can complete tasks.',
        flags: EPHEMERAL_FLAG,
      });
    }
    const id = interaction.options.getInteger('id');
    const task = state.tasks.find((t) => t.id === id);

    if (!task) {
      return interaction.reply({
        content: `❌ Task #${id} doesn't exist.`,
        flags: EPHEMERAL_FLAG,
      });
    }

    task.done = true;
    saveState(state);
    await updateTodoThread(interaction.client, state);

    return interaction.reply({
      content: `✅ Completed task #${id}.`,
      flags: EPHEMERAL_FLAG,
    });
  }

  if (sub === 'list') {
    let content = '## 📝 Community To-Do List\n\n';

    if (!state.tasks?.length) {
      content += '*Nothing has been added yet.*';
    } else {
      for (const task of state.tasks) {
        content += task.done
          ? `~~${task.id}. ${task.text}~~\n`
          : `${task.id}. ${task.text}\n`;
      }
    }
    return interaction.reply({
      content,
      flags: EPHEMERAL_FLAG,
    });
  }
}
