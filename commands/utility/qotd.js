//qotd command
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';
import { MOD_CHANNEL_ID } from '../../constants/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../../utils/qotdState.json');

//name of slash command & description
export const data = (() => {
  const command = new SlashCommandBuilder()
    .setName('qotd')
    .setDescription('Queue a Question of the Day')
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('The question to post')
        .setRequired(true)
    );
  //loop for possible options
  for (let i = 1; i <= 10; i++) {
    command.addStringOption((option) =>
      option
        .setName(`option${i}`)
        .setDescription(`Poll option ${i}`)
        .setRequired(false)
    );
  }
  return command;
})();

//queue the qotd
export const execute = async (interaction) => {
  await interaction.deferReply({ flags: EPHEMERAL_FLAG });

  //safe state load
  const rawState = JSON.parse(fs.readFileSync(statePath, 'utf8') || '{}');

  const state = {
    lastQuestionNumber: rawState.lastQuestionNumber || 0,
    queue: rawState.queue || [],
    activeThreadId: rawState.activeThreadId || null,
  };

  //question
  const question = interaction.options.getString('question')?.trim();

  //get options
  const optionKeys = Array.from({ length: 10 }, (_, i) =>
    interaction.options.getString(`option${i + 1}`)
  );
  const options = optionKeys.map((o) => o?.trim()).filter(Boolean);
  const isPoll = options.length >= 2;

  //queue item
  const queueItem = {
    userId: interaction.user.id,
    username: interaction.user.tag,
    avatar: interaction.user.displayAvatarURL(),
    question,
    options,
    type: isPoll ? 'poll' : 'discussion',
    queuedAt: Date.now(),
  };
  //add to json
  state.queue.push(queueItem);
  const position = state.queue.length;
  const days = Math.max(1, position);
  //save
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  //embed message
  const embed = new EmbedBuilder()
    .setColor('Yellow')
    .setTitle('📥 QOTD Queued 📥')
    .setThumbnail(queueItem.avatar)
    .setDescription(
      `### 🪑 Submitted By\n` +
        `<@${queueItem.userId}>\n` +
        `### ❓ Question\n` +
        `${queueItem.question}\n`
    )
    .addFields(
      {
        name: '📝 Type',
        value: isPoll ? '📊 Poll' : '💬 Discussion',
        inline: true,
      },
      ...(isPoll
        ? [
            {
              name: '🔢 Poll Options',
              value: options
                .map((option, index) => `**${index + 1}.** ${option}`)
                .join('\n'),
              inline: false,
            },
          ]
        : [])
    )
    .setFooter({
      text: `🎫 Queue Position #${position} • 📆 Estimated Posting: ${days} day${days === 1 ? '' : 's'}`,
    })
    .setTimestamp();

  //reply to user
  await interaction.editReply({ embeds: [embed] });

  //send to mod channel
  try {
    const modChannel = await interaction.client.channels.fetch(MOD_CHANNEL_ID);
    if (modChannel) {
      await modChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('Failed to send mod alert:', err);
  }
};
