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
const mediaStatePath = path.join(__dirname, '../../data/mediaTodoState.json');

//default
function getDefaultState() {
  return {
    threadId: null,
    messageId: null,
    lastTaskId: 0,
    tasks: [],
  };
}

//load state
function loadState(filePath) {
  if (!fs.existsSync(filePath)) {
    return getDefaultState();
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

//save state
function saveState(filePath, state) {
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

//config
const LIST_CONFIGS = {
  todo: {
    statePath: todoStatePath,
    title: "Jim's To-Do List",
    threadName: "📋 Jim's To-Do List",
    emoji: '📋',
    addCommand: '/todo add',
    emptyText: '_No tasks currently._',
    listTitle: '## 📝 Community To-Do List',
    emptyListText: '*Nothing has been added yet.*',
  },
  media: {
    statePath: mediaStatePath,
    title: "Jim's Media List",
    threadName: "🎬 Jim's Jellyfin",
    emoji: '🎬',
    addCommand: '/todo media add',
    emptyText: '_No media suggestions currently._',
    listTitle: '## 🎬 Community Watch List',
    emptyListText: '*Nothing has been suggested yet.*',
  },
};

//render list
function renderList(tasks, config) {
  const addedTasks = tasks.filter((task) => !task.done);

  const completedTasks = tasks
    .filter((task) => task.done)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  let text = `# ${config.emoji} ${config.title}\n\n`;
  text += `Use \`${config.addCommand}\` to suggest new items.\n\n`;
  text += `## Added\n\n`;

  if (!addedTasks.length) {
    text += '_Nothing currently added._\n\n';
  } else {
    for (const task of addedTasks) {
      text +=
        `⬜ #${task.id} • ${task.text}\n` +
        `Suggested by <@${task.userId}>\n\n`;
    }
  }
  text += `---\n\n`;
  text += `## Completed\n\n`;

  if (!completedTasks.length) {
    text += '_Nothing completed yet._';
  } else {
    for (const task of completedTasks) {
      text +=
        `✅ ~~#${task.id} • ${task.text}~~\n` +
        `Suggested by <@${task.userId}>\n\n`;
    }
  }
  return text;
}

//update thread
async function updateListThread(client, state, config) {
  const forum = await client.channels.fetch(FORUM_CHANNEL_ID);
  if (!forum) return;
  let thread;

  if (!state.threadId) {
    thread = await forum.threads.create({
      name: config.threadName,
      appliedTags: [TODO_TAG_ID],
      message: {
        content: renderList(state.tasks, config),
      },
    });
    state.threadId = thread.id;
    const starter = await thread.fetchStarterMessage();
    state.messageId = starter.id;
    saveState(config.statePath, state);
    return;
  }
  thread = await forum.threads.fetch(state.threadId);
  const message = await thread.messages.fetch(state.messageId);

  await message.edit(renderList(state.tasks, config));
}

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('todo')
  .setDescription('Manage server lists')
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
  )
  .addSubcommandGroup((group) =>
    group
      .setName('media')
      .setDescription('Manage the watch list')

      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Add something to watch')
          .addStringOption((option) =>
            option
              .setName('title')
              .setDescription('Movie, show, anime, video, etc.')
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('complete')
          .setDescription('Mark a media item as watched')
          .addIntegerOption((option) =>
            option
              .setName('id')
              .setDescription('Media item ID')
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub.setName('list').setDescription('View the watch list')
      )
  );

//todo
export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();
  const listType = group === 'media' ? 'media' : 'todo';
  const config = LIST_CONFIGS[listType];
  const state = loadState(config.statePath);

  if (sub === 'add') {
    const optionName = listType === 'media' ? 'title' : 'task';
    const text = interaction.options.getString(optionName).trim();

    state.tasks.push({
      id: ++state.lastTaskId,
      text,
      userId: interaction.user.id,
      username: interaction.user.tag,
      done: false,
      createdAt: Date.now(),
    });
    saveState(config.statePath, state);
    await updateListThread(interaction.client, state, config);

    return interaction.reply({
      content:
        listType === 'media'
          ? '✅ Added to the watch list.'
          : '✅ Task added to the to-do list.',
      flags: EPHEMERAL_FLAG,
    });
  }
  if (sub === 'complete') {
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({
        content:
          listType === 'media'
            ? '❌ Only Jim can confirm media added.'
            : '❌ Only Jim can complete tasks.',
        flags: EPHEMERAL_FLAG,
      });
    }
    const id = interaction.options.getInteger('id');
    const task = state.tasks.find((t) => t.id === id);
    if (!task) {
      return interaction.reply({
        content: `❌ Item #${id} doesn't exist.`,
        flags: EPHEMERAL_FLAG,
      });
    }
    task.done = true;
    task.completedAt = Date.now();
    saveState(config.statePath, state);
    await updateListThread(interaction.client, state, config);

    return interaction.reply({
      content:
        listType === 'media'
          ? `✅ Marked media item #${id} as added.`
          : `✅ Completed task #${id}.`,
      flags: EPHEMERAL_FLAG,
    });
  }

  if (sub === 'list') {
    const addedTasks = state.tasks.filter((task) => !task.done);
    const completedTasks = state.tasks.filter((task) => task.done);
    let content = `${config.listTitle}\n\n`;
    content += `### Added\n\n`;

    if (!addedTasks.length) {
      content += '*Nothing currently added.*\n\n';
    } else {
      for (const task of addedTasks) {
        content += `${task.id}. ${task.text}\n`;
      }
      content += '\n';
    }
    content += `### Completed\n\n`;

    if (!completedTasks.length) {
      content += '*Nothing completed yet.*';
    } else {
      for (const task of completedTasks) {
        content += `~~${task.id}. ${task.text}~~\n`;
      }
    }
    return interaction.reply({
      content,
      flags: EPHEMERAL_FLAG,
    });
  }
}
