//headpat message command
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

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('headpat')
  .setDescription('Headpat a deserving person')
  .addUserOption((option) =>
    option
      .setName('target')
      .setDescription('The user to headpat')
      .setRequired(true)
  );

//adds user's profile pic to canvas
export const execute = async (interaction) => {
  await interaction.deferReply();
  const target = interaction.options.getMember('target');
  const options = {
    fps: 15,
    delay: 0,
    repeat: 0,
    algorithm: 'neuquant',
    optimiser: true,
    quality: 100,
  };

  //gets user's profile pic
  const avatar = await loadImage(target.displayAvatarURL({ extension: 'png' }));

  //creates new gif of user's avatar getting a headpat
  const callBack = async (
    context,
    _width,
    _height,
    _totalFrames,
    currentFrame
  ) => {
    const canvas = createCanvas(avatar.width, avatar.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(avatar, 0, 0, avatar.width, avatar.height);
    context.globalCompositeOperation = 'destination-over';
    if (currentFrame % 3 == 0) {
      context.drawImage(canvas, 0, 20, canvas.width, canvas.height + 20);
    } else {
      context.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    }
  };

  //sends new headpat gif and message
  canvasGif(join(__dirname, 'headpat.gif'), callBack, options)
    .then((buffer) => {
      const attachment = new AttachmentBuilder(buffer, { name: 'headpat.gif' });
      return interaction.followUp({
        content: `${interaction.member} is headpatting ${target}!`,
        files: [attachment],
      });
    })
    .catch((error) => {
      console.error(error);
      return interaction.followUp({
        content: 'Something went wrong, whoops.',
        flags: MessageFlagsBitField.Ephemeral,
      });
    });
};
