//todo command
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import {
  containsLink,
  loadState,
  saveState,
  upsertThread,
  TODO_CONFIG,
} from '../../utils/todoUtils.js';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';
import { sendModAlert } from '../../utils/modAlerts.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('todo')
  .setDescription('Manage lists')
  .addSubcommand((sub) =>
    sub
      .setName('add')
      .setDescription('Add a task')
      .addStringOption((opt) =>
        opt.setName('text').setDescription('Task').setRequired(true)
      )
  )
  .addSubcommand((sub) => sub.setName('list').setDescription('View list'))
  .addSubcommandGroup((group) =>
    group
      .setName('media')
      .setDescription('Media list')
      .addSubcommand((sub) =>
        sub
          .setName('add')
          .setDescription('Add media')
          .addStringOption((opt) =>
            opt.setName('title').setDescription('Media title').setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub.setName('list').setDescription('View media list')
      )
  );

//todo
export async function execute(interaction) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();

  //check group
  const type = group === 'media' ? 'media' : 'todo';
  const config = TODO_CONFIG[type];

  const state = loadState(config.statePath);

  //add item
  if (sub === 'add') {
    const text = interaction.options.getString(
      type === 'media' ? 'title' : 'text'
    );

    //link/embed check
    if (containsLink(text)) {
      return interaction.reply({
        content: '❌ Links are not allowed.',
        flags: EPHEMERAL_FLAG,
      });
    }

    //add item to json
    state.tasks.push({
      id: ++state.lastTaskId,
      text,
      userId: interaction.user.id,
      done: false,
      createdAt: Date.now(),
    });

    //save
    saveState(config.statePath, state);
    await upsertThread(interaction.client, state, config);

    //send mod alert
    await sendModAlert(interaction.client, {
      type: `${type}.add`,
      user: {
        id: interaction.user.id,
        avatar: interaction.user.displayAvatarURL(),
      },
      content: text,
    });
    //confirm added
    return interaction.reply({
      content: '✅ Added.',
      flags: EPHEMERAL_FLAG,
    });
  }

  //list
  if (sub === 'list') {
    if (!Array.isArray(state.tasks)) {
      return interaction.reply({
        content: '⚠️ No tasks found.',
        flags: EPHEMERAL_FLAG,
      });
    }
    //list active items
    const active = state.tasks.filter(
      (t) => t && typeof t === 'object' && t.done !== true
    );

    if (active.length === 0) {
      return interaction.reply({
        content: '_No active tasks._',
        flags: EPHEMERAL_FLAG,
      });
    }
    const text = active
      .sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
      .map((t) => `⬜ #${t.id} • ${t.text ?? '[missing text]'}`)
      .join('\n');

    return interaction.reply({
      content: text,
      flags: EPHEMERAL_FLAG,
    });
  }
}
