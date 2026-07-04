//qotd-admin
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';
import { postNextQotd } from '../../utils/qotdUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../../data/qotdState.json');

//load state
function loadState() {
  if (!fs.existsSync(statePath)) {
    return { queue: [] };
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

//save state
function saveState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

//render the current qotd queue
function renderQueue(queue) {
  if (!queue.length) return '📭 Queue is empty.';

  return (
    `📋 **QOTD Queue** (${queue.length})\n\n` +
    queue
      .map(
        (q, i) =>
          `**${i + 1}.** ${q.question}\n` +
          `🪑 <@${q.userId}> • ${q.type || 'discussion'}\n`
      )
      .join('\n')
  );
}

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('qotd-admin')
  .setDescription('Admin tools for QOTD system')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((sub) =>
    sub.setName('list').setDescription('View queued QOTDs')
  )
  .addSubcommand((sub) =>
    sub
      .setName('remove')
      .setDescription('Remove a queued QOTD by index')
      .addIntegerOption((opt) =>
        opt.setName('id').setDescription('Queue number').setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName('post').setDescription('Immediately post next QOTD')
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
  const state = loadState();

  state.queue ||= [];

  //list
  if (sub === 'list') {
    return interaction.reply({
      content: renderQueue(state.queue),
      flags: EPHEMERAL_FLAG,
    });
  }

  //remove
  if (sub === 'remove') {
    const id = interaction.options.getInteger('id');

    if (id < 1 || id > state.queue.length) {
      return interaction.reply({
        content: `❌ Invalid queue ID.`,
        flags: EPHEMERAL_FLAG,
      });
    }
    const removed = state.queue.splice(id - 1, 1)[0];
    saveState(state);

    return interaction.reply({
      content: `✅ Removed: **${removed.question}**`,
      flags: EPHEMERAL_FLAG,
    });
  }

  //post next
  if (sub === 'post') {
    await postNextQotd(interaction.client);

    return interaction.reply({
      content: '🚀 Forced QOTD post triggered.',
      flags: EPHEMERAL_FLAG,
    });
  }
}
