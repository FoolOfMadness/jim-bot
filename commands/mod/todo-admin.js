//todo-admin
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';
import {
  loadState,
  saveState,
  upsertThread,
  upsertCompletedLog,
  TODO_CONFIG,
} from '#utils/todoUtils';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('todo-admin')
  .setDescription('Admin controls for todo lists')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub
      .setName('complete')
      .setDescription('Mark task complete')
      .addStringOption((opt) =>
        opt
          .setName('list')
          .setDescription('List')
          .setRequired(true)
          .addChoices(
            { name: 'todo', value: 'todo' },
            { name: 'media', value: 'media' }
          )
      )
      .addIntegerOption((opt) =>
        opt.setName('id').setDescription('ID').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Delete a task')
      .addStringOption((opt) =>
        opt
          .setName('list')
          .setDescription('List')
          .setRequired(true)
          .addChoices(
            { name: 'todo', value: 'todo' },
            { name: 'media', value: 'media' }
          )
      )
      .addIntegerOption((opt) =>
        opt.setName('id').setDescription('ID').setRequired(true)
      )
  );

//check if admin first
export async function execute(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Admin only.',
      flags: EPHEMERAL_FLAG,
    });
  }
  const sub = interaction.options.getSubcommand();

  const type = interaction.options.getString('list');
  const config = TODO_CONFIG[type];

  //config check
  if (!config) {
    return interaction.reply({
      content: '❌ Invalid list.',
      flags: EPHEMERAL_FLAG,
    });
  }

  const state = loadState(config.statePath);

  //complete task
  if (sub === 'complete') {
    const id = interaction.options.getInteger('id');

    const task = state.tasks.find((t) => t.id === id);

    if (!task) {
      return interaction.reply({
        content: '❌ Not found.',
        flags: EPHEMERAL_FLAG,
      });
    }

    //mark task complete
    task.done = true;
    task.completedAt = Date.now();
    task.completedBy = interaction.user.id;

    saveState(config.statePath, state);

    //update active items
    await upsertThread(interaction.client, state, config);

    //update completed log message
    await upsertCompletedLog(interaction.client, state, config, type);

    return interaction.reply({
      content: `✅ Completed #${id}`,
      flags: EPHEMERAL_FLAG,
    });
  }

  //remove
  if (sub === 'remove') {
    const id = interaction.options.getInteger('id');

    state.tasks = state.tasks.filter((t) => t.id !== id);

    saveState(config.statePath, state);
    await upsertThread(interaction.client, state, config);

    return interaction.reply({
      content: `🗑 Removed #${id}`,
      flags: EPHEMERAL_FLAG,
    });
  }
}
