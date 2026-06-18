//bonk message command
import canvasGif from 'canvas-gif';
import { loadImage, createCanvas } from 'canvas';
import { join } from 'node:path';
import {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlagsBitField,
} from 'discord.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//config variables
const AVATAR_SIZE = 256;
const BONK_OFFSET_Y = 20;
const GIF_FPS = 15;
const GIF_QUALITY = 50;

//prevents simultaneous gif renders
let isRenderingGif = false;

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
  if (isRenderingGif) {
    return interaction.reply({
      content: "I'm already bonking someone, give me a minute.",
      flags: MessageFlagsBitField.Ephemeral,
    });
  }

  //gif lock on
  isRenderingGif = true;

  await interaction.deferReply();

  try {
    const target = interaction.options.getMember('target');

    if (!target) {
      return interaction.followUp({
        content: "I don't know anyone by that name...",
        flags: MessageFlagsBitField.Ephemeral,
      });
    }

    //get user profile pic
    const avatar = await loadImage(
      target.displayAvatarURL({
        extension: 'png',
        size: AVATAR_SIZE,
      })
    );

    //pre-render avatar once
    const avatarCanvas = createCanvas(AVATAR_SIZE, AVATAR_SIZE);
    const avatarCtx = avatarCanvas.getContext('2d');

    avatarCtx.drawImage(avatar, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    const options = {
      fps: GIF_FPS,
      delay: 0,
      repeat: 0,
      algorithm: 'neuquant',
      optimiser: true,
      quality: GIF_QUALITY,
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

      if (currentFrame % 7 === 0) {
        context.drawImage(
          avatarCanvas,
          0,
          BONK_OFFSET_Y,
          AVATAR_SIZE,
          AVATAR_SIZE + BONK_OFFSET_Y
        );
      } else {
        context.drawImage(avatarCanvas, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      }
    };

    const buffer = await canvasGif(
      join(__dirname, 'bonk.gif'),
      callBack,
      options
    );

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
      flags: MessageFlagsBitField.Ephemeral,
    });
    //gif lock off
  } finally {
    isRenderingGif = false;
  }
};
