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
import { TODO_IMAGE, MEDIA_IMAGE } from '../../constants/assets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const todoStatePath = path.join(__dirname, '../../data/todoState.json');
const mediaStatePath = path.join(__dirname, '../../data/mediaTodoState.json');

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
      .setDescription('Jim only - finished task')
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
          .setDescription('Jim only - media added')
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
    image: TODO_IMAGE,
    emoji: '📋',
    addCommand: '/todo add',
    listTitle: "## 📝 Jim's Tasks",
    pendingHeading: 'Pending',
    completedHeading: 'Completed',
    pendingEmpty: '_Nothing currently added._',
    completedEmpty: '_Nothing completed yet._',
  },
  media: {
    statePath: mediaStatePath,
    title: "Jim's Media List",
    threadName: "🎬 Jim's Jellyfin",
    image: MEDIA_IMAGE,
    emoji: '🎬',
    addCommand: '/todo media add',
    listTitle: '## 🎬 Buddy Watch List',
    pendingHeading: 'Requested',
    completedHeading: 'Added to Jellyfin',
    pendingEmpty: '_No media requests currently._',
    completedEmpty: '_Nothing has been added yet._',
  },
};

//render list
function renderList(tasks, config, headingLevel = '##') {
  const addedTasks = tasks.filter((task) => !task.done);
  const completedTasks = tasks
    .filter((task) => task.done)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  let text = `${headingLevel === '#' ? '' : `${config.listTitle}\n\n`}`;

  if (headingLevel === '#') {
    text += `# ${config.emoji} ${config.title}\n\n`;
    text += `Use \`${config.addCommand}\` to suggest new items.\n\n`;
  }
  text += `${headingLevel} ${config.pendingHeading}\n\n`;

  if (!addedTasks.length) {
    text += `${config.pendingEmpty}\n\n`;
  } else {
    for (const task of addedTasks) {
      text +=
        `⬜ #${task.id} • ${task.text}\n` +
        `Suggested by <@${task.userId}>\n\n`;
    }
  }
  text += `---\n\n`;
  text += `${headingLevel} ${config.completedHeading}\n\n`;

  if (!completedTasks.length) {
    text += config.completedEmpty;
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
        content: renderList(state.tasks, config, '#'),
        files: [config.image],
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

  await message.edit(renderList(state.tasks, config, '#'));
}

//todo
export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();
  const listType = group === 'media' ? 'media' : 'todo';
  const config = LIST_CONFIGS[listType];
  const state = loadState(config.statePath);

  //add item to json
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
    //save json & update thread
    saveState(config.statePath, state);
    await updateListThread(interaction.client, state, config);

    //confirm item added to list
    return interaction.reply({
      content:
        listType === 'media'
          ? '✅ Added to the watch list.'
          : '✅ Task added to the to-do list.',
      flags: EPHEMERAL_FLAG,
    });
  }
  //jim check item off list
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

    //confirm item completed
    return interaction.reply({
      content:
        listType === 'media'
          ? `✅ Marked media item #${id} as added.`
          : `✅ Completed task #${id}.`,
      flags: EPHEMERAL_FLAG,
    });
  }
  //send ephemeral list to user
  if (sub === 'list') {
    if (sub === 'list') {
      return interaction.reply({
        content: renderList(state.tasks, config, '###'),
        flags: EPHEMERAL_FLAG,
      });
    }
  }
}
