//qotd command
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import {
  EPHEMERAL_FLAG,
  MAX_OPTION_LENGTH,
  MAX_QUESTION_LENGTH,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
} from '../../constants/discordDefinitions.js';
import { MOD_CHANNEL_ID } from '../../constants/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const statePath = path.join(__dirname, '../../data/qotdState.json');

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
    )
    .addAttachmentOption((option) =>
      option
        .setName('image')
        .setDescription('Optional image/video')
        .setRequired(false)
    );
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

//qotd
export const execute = async (interaction) => {
  await interaction.deferReply({ flags: EPHEMERAL_FLAG });

  //load state
  const rawState = JSON.parse(fs.readFileSync(statePath, 'utf8') || '{}');
  const state = {
    lastQuestionNumber: rawState.lastQuestionNumber || 0,
    queue: rawState.queue || [],
    activeThreadId: rawState.activeThreadId || null,
  };

  //inputs
  const question = interaction.options.getString('question')?.trim();
  const image = interaction.options.getAttachment('image');

  //validate attachment
  function isValidAttachment(file) {
    if (!file) return true;
    const mimeValid =
      file.contentType && ALLOWED_MIME_TYPES.has(file.contentType);
    const url = file.url?.toLowerCase() || '';
    const extValid = ALLOWED_EXTENSIONS.some((ext) => url.endsWith(ext));
    return mimeValid || extValid;
  }
  if (!isValidAttachment(image)) {
    return interaction.editReply({
      content:
        '❌ Unsupported file type.\n\nAllowed: PNG, JPG, GIF, WEBP, MP4, WEBM',
      flags: EPHEMERAL_FLAG,
    });
  }

  //validate question
  if (!question) {
    return interaction.editReply({
      content: '❌ Please enter a question.',
      flags: EPHEMERAL_FLAG,
    });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return interaction.editReply({
      content:
        `❌ Questions cannot exceed **${MAX_QUESTION_LENGTH} characters**.\n` +
        `Current length: **${question.length}**.`,
      flags: EPHEMERAL_FLAG,
    });
  }

  //options
  const optionKeys = Array.from({ length: 10 }, (_, i) =>
    interaction.options.getString(`option${i + 1}`)
  );

  const options = optionKeys.map((o) => o?.trim()).filter(Boolean);

  const isPoll = options.length >= 2;

  for (let i = 0; i < options.length; i++) {
    if (options[i].length > MAX_OPTION_LENGTH) {
      return interaction.editReply({
        content:
          `❌ **Poll option ${i + 1}** exceeds **${MAX_OPTION_LENGTH} characters**.\n` +
          `Current length: **${options[i].length}**.`,
        flags: EPHEMERAL_FLAG,
      });
    }
  }

  //store image url only
  const imageUrl = image?.url ?? null;
  const hasAttachment = Boolean(imageUrl);

  //queue item
  const queueItem = {
    userId: interaction.user.id,
    username: interaction.user.tag,
    avatar: interaction.user.displayAvatarURL(),
    question,
    options,
    type: isPoll ? 'poll' : 'discussion',
    image: imageUrl,
    queuedAt: Date.now(),
  };

  state.queue.push(queueItem);

  const position = state.queue.length;
  const days = Math.max(1, position);

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  //embed message
  const embed = new EmbedBuilder()
    .setColor('Yellow')
    .setTitle('📥 QOTD Queued 📥')
    .setThumbnail(queueItem.avatar)
    .setDescription(
      `### 🪑 Submitted By\n<@${queueItem.userId}>\n\n` +
        `### ❓ Question\n${queueItem.question}\n\n` +
        `### 📎 Attachment\n${hasAttachment ? 'Yes' : 'None'}`
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
              value: options.map((o, i) => `**${i + 1}.** ${o}`).join('\n'),
              inline: false,
            },
          ]
        : [])
    )
    .setFooter({
      text: `🎫 Queue Position #${position} • 📆 ~${days} day(s) until posting`,
    })
    .setTimestamp();

  //user reply
  await interaction.editReply({ embeds: [embed] });

  //send to mod channel
  try {
    const modChannel = await interaction.client.channels.fetch(MOD_CHANNEL_ID);

    if (modChannel) {
      if (imageUrl) {
        await modChannel.send({
          embeds: [embed],
          files: [imageUrl],
        });
      } else {
        await modChannel.send({ embeds: [embed] });
      }
    }
  } catch (err) {
    console.error('Failed to send mod alert:', err);
  }
};
