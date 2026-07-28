//mod alerts utility
import { EmbedBuilder } from 'discord.js';
import { MOD_CHANNEL_ID } from '#constants/env';
import path from 'path';

async function getModChannel(client) {
  try {
    return await client.channels.fetch(MOD_CHANNEL_ID);
  } catch (err) {
    console.error('modAlerts: failed to fetch mod channel', err);
    return null;
  }
}

//send an alert
export async function sendModAlert(client, payload) {
  const modChannel = await getModChannel(client);
  if (!modChannel) return;

  const embed = buildEmbed(payload);
  if (!embed) return;

  const messagePayload = {
    embeds: [embed],
  };
  if (payload.file) {
    const ext = path.extname(payload.file);

    messagePayload.files = [
      {
        attachment: payload.file,
        name: `qotd-attachment${ext}`,
      },
    ];
  }
  await modChannel.send(messagePayload);
}

//make the alert embed message
function buildEmbed({ type, user, content, meta = {} }) {
  const embed = new EmbedBuilder().setTimestamp();

  //fallback default
  const avatar = user?.displayAvatarURL?.() ?? null;
  const userId = user?.id ?? 'unknown';

  switch (type) {
    //todo or media embed
    case 'todo.add':
    case 'media.add': {
      const isMedia = type === 'media.add';

      embed
        .setColor(isMedia ? 0x5865f2 : 0xf1c40f)
        .setTitle(`📥 ${isMedia ? 'Media Added' : 'Task Added'}`)
        .setThumbnail(avatar)
        .setDescription(
          `### 🪑 Submitted By\n<@${userId}>\n` + `### 📝 Item\n${content}`
        )
        .addFields({
          name: 'Type',
          value: isMedia ? '🎬 Media' : '📋 Todo',
          inline: true,
        });

      return embed;
    }

    //qotd queue embed
    case 'qotd.queue': {
      const isPoll = meta.isPoll;

      embed
        .setColor(0xf1c40f)
        .setTitle('📥 QOTD Queued')
        .setThumbnail(avatar)
        .setDescription(
          `### 🪑 Submitted By\n<@${userId}>\n` + `### ❓ Question\n${content}`
        )
        .addFields(
          {
            name: 'Type',
            value: isPoll ? '📊 Poll' : '💬 Discussion',
            inline: true,
          },
          {
            name: 'Attachment',
            value: meta.hasAttachment ? 'Yes' : 'No',
            inline: true,
          }
        );
      if (isPoll && meta.options?.length) {
        embed.addFields({
          name: 'Options',
          value: meta.options.map((o, i) => `**${i + 1}.** ${o}`).join('\n'),
        });
      }
      if (meta.position != null) {
        embed.setFooter({
          text: `Queue Position #${meta.position}`,
        });
      }
      return embed;
    }

    //weather request embed
    case 'weather.request': {
      embed
        .setColor(0x2ecc71)
        .setTitle('🌤️ Weather Requested')
        .setThumbnail(avatar)
        .setDescription(`### 🪑 Requested By\n<@${userId}>`)
        .addFields(
          {
            name: 'Input',
            value: meta.input || 'Unknown',
          },
          {
            name: 'Resolved Location',
            value: meta.resolvedLocation || 'Unknown',
          },
          {
            name: 'Forecast',
            value: meta.forecastType || 'current',
            inline: true,
          },
          {
            name: 'Unit',
            value: meta.unit || 'C',
            inline: true,
          }
        );

      return embed;
    }

    //timestamp request embed
    case 'timestamp.create': {
      embed
        .setColor(0x3498db)
        .setTitle('🕒 Timestamp Created')
        .setThumbnail(avatar)
        .setDescription(`### 🪑 Requested By\n<@${userId}>`)
        .addFields(
          {
            name: 'Timezone',
            value: meta.timezone || 'Default',
            inline: true,
          },
          {
            name: 'Date',
            value: meta.date || 'Default',
            inline: true,
          },
          {
            name: 'Time',
            value: meta.time || 'Default',
            inline: true,
          },
          {
            name: 'Format',
            value: meta.format || 'F',
            inline: true,
          }
        );

      return embed;
    }
    default:
      return null;
  }
}
