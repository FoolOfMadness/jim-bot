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
  await interaction.deferReply();
  const target = interaction.options.getMember('target');

  //gets user's profile pic
  const avatar = await loadImage(target.displayAvatarURL({ extension: 'png' }));

  const options = {
    fps: 15,
    delay: 0,
    repeat: 0,
    algorithm: 'neuquant',
    optimiser: true,
    quality: 100,
  };

  //creates new gif of user's avatar getting bonked
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
    if (currentFrame % 7 == 0) {
      context.drawImage(canvas, 0, 20, canvas.width, canvas.height + 20);
    } else {
      context.drawImage(canvas, 0, 0, canvas.width, canvas.height);
    }
  };
  //sends new bonk gif and message
  canvasGif(join(__dirname, 'bonk.gif'), callBack, options)
    .then((buffer) => {
      const attachment = new AttachmentBuilder(buffer, { name: 'bonk.gif' });
      return interaction.followUp({
        content: `${interaction.member} is bonking ${target}!`,
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
