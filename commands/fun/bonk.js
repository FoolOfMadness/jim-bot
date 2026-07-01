//bonk message command
import canvasGif from 'canvas-gif';
import { loadImage, createCanvas } from 'canvas';
import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';
import { GIF_CONFIG } from '../../constants/gifDefinitions.js';
import { lockGif, unlockGif } from '../../utils/gifLock.js';
import { BONK_GIF } from '../../constants/assets.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('bonk')
  .setDescription('Kill them with hammers')
  .addUserOption((option) =>
    option
      .setName('target')
      .setDescription('The one we are offering a headache to')
      .setRequired(true)
  );

//adds user's profile pic to canvas
export const execute = async (interaction) => {
  const jobId = `${interaction.commandName}-${interaction.id}`;

  //global GIF lock check
  if (!lockGif(jobId)) {
    return interaction.reply({
      content: "I'm already making a GIF, give me a minute.",
      flags: EPHEMERAL_FLAG,
    });
  }

  await interaction.deferReply();

  try {
    const target = interaction.options.getMember('target');

    if (!target) {
      return interaction.followUp({
        content: "I don't know anyone by that name...",
        flags: EPHEMERAL_FLAG,
      });
    }

    //get user profile pic
    const avatar = await loadImage(
      target.displayAvatarURL({
        extension: 'png',
        size: GIF_CONFIG.avatarSize,
      })
    );

    //pre-render avatar once
    const avatarCanvas = createCanvas(
      GIF_CONFIG.avatarSize,
      GIF_CONFIG.avatarSize
    );

    const avatarCtx = avatarCanvas.getContext('2d');

    avatarCtx.drawImage(
      avatar,
      0,
      0,
      GIF_CONFIG.avatarSize,
      GIF_CONFIG.avatarSize
    );

    //use import values
    const options = {
      fps: GIF_CONFIG.fps,
      delay: GIF_CONFIG.delay,
      repeat: GIF_CONFIG.repeat,
      algorithm: GIF_CONFIG.algorithm,
      optimiser: GIF_CONFIG.optimiser,
      quality: GIF_CONFIG.quality,
    };

    //creates new gif of user's avatar getting bonked
    const callBack = async (
      context,
      _width,
      _height,
      _totalFrames,
      currentFrame
    ) => {
      context.globalCompositeOperation = 'destination-over';

      //drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
      if (currentFrame % 7 === 0) {
        context.drawImage(
          avatarCanvas,
          0,
          0,
          avatarCanvas.width,
          avatarCanvas.height,
          0,
          GIF_CONFIG.avatarOffsetY,
          GIF_CONFIG.avatarSize,
          GIF_CONFIG.avatarSize
        );
      } else {
        context.drawImage(
          avatarCanvas,
          0,
          0,
          avatarCanvas.width,
          avatarCanvas.height,
          0,
          GIF_CONFIG.avatarOffsetY,
          GIF_CONFIG.avatarSize,
          GIF_CONFIG.avatarSize
        );
      }
    };

    const buffer = await canvasGif(BONK_GIF, callBack, options);

    const attachment = new AttachmentBuilder(buffer, {
      name: 'bonk.gif',
    });

    //bonk user
    return interaction.followUp({
      content: `${interaction.member} is bonking ${target}!`,
      files: [attachment],
    });
  } catch (error) {
    console.error('Bonk command failed:', error);

    return interaction.followUp({
      content: 'Something went wrong, whoops.',
      flags: EPHEMERAL_FLAG,
    });
  } finally {
    unlockGif(jobId);
  }
};
