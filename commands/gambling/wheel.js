//wheel command
import {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} from 'discord.js';
import { createCanvas } from 'canvas';
import GIFEncoder from 'gifencoder';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions';

//config variables
const WHEEL_SIZE = 400;
const WHEEL_PADDING = 10;
const POINTER_SIZE = 15;
const CENTER_DOT_SIZE = 10;

const GIF_FPS = 15;
const GIF_TOTAL_FRAMES = 45;
const GIF_QUALITY = 15;

const MAX_SEGMENTS = 20;
const MAX_LABEL_LENGTH = 24;

//prevents simultaneous gif renders
let isRenderingGif = false;

//single tiny canvas for colour validation/parsing
const colourParseCtx = createCanvas(1, 1).getContext('2d');

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('wheel')
  .setDescription('Spin a custom wheel')
  .addStringOption((option) =>
    option
      .setName('options')
      .setDescription(
        'Comma-separated list of options (e.g., win,lose,jackpot)'
      )
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('colours')
      .setDescription(
        'Optional: comma-separated list of colours (e.g., red,blue,#00ff00)'
      )
      .setRequired(false)
  );

//spin the wheel
export const execute = async (interaction) => {
  //gif lock check
  if (isRenderingGif) {
    return interaction.reply({
      content: "I'm already spinning, give me a minute.",
      flags: EPHEMERAL_FLAG,
    });
  }

  const input = interaction.options.getString('options');
  const colourInput = interaction.options.getString('colours') || '';

  //create wheel segments based on input
  const segments = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) =>
      s.length > MAX_LABEL_LENGTH ? `${s.slice(0, MAX_LABEL_LENGTH)}...` : s
    );

  //ensure more than 2 options
  if (segments.length < 2) {
    return interaction.reply({
      content: 'Please provide at least two options.',
      flags: EPHEMERAL_FLAG,
    });
  }
  //ensure less than max
  if (segments.length > MAX_SEGMENTS) {
    return interaction.reply({
      content: `Please provide ${MAX_SEGMENTS} options or fewer.`,
      flags: EPHEMERAL_FLAG,
    });
  }

  //gif lock on
  isRenderingGif = true;

  await interaction.deferReply();

  try {
    const colourInputs = colourInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const segmentData = buildSegmentData(segments, colourInputs);

    //create canvas
    const canvas = createCanvas(WHEEL_SIZE, WHEEL_SIZE);
    const ctx = canvas.getContext('2d');

    //select winner when wheel is finished spinning
    const { winner, buffer } = await spinWheel(ctx, canvas, segmentData);

    const attachment = new AttachmentBuilder(buffer, {
      name: 'wheel.gif',
    });

    //embed message
    const embed = new EmbedBuilder()
      .setTitle('🎡 Spinning the Wheel!')
      .setDescription(`The wheel has spoken... **${winner}**!`)
      .setColor(0x00ae86)
      .setImage('attachment://wheel.gif')
      .setTimestamp();

    return interaction.editReply({
      embeds: [embed],
      files: [attachment],
    });
  } catch (error) {
    console.error('Wheel command failed:', error);

    return interaction.editReply({
      content: 'Something went wrong while spinning the wheel...',
    });
  } finally {
    //gif lock off
    isRenderingGif = false;
  }
};

//build segment data once so it does not recalculate every frame
function buildSegmentData(segments, colourInputs) {
  return segments.map((label, index) => {
    const fallbackColour = `hsl(${(index * 360) / segments.length}, 100%, 50%)`;
    const inputColour = colourInputs[index];

    const colour =
      inputColour && isValidColor(inputColour)
        ? normaliseColour(inputColour)
        : fallbackColour;

    const rgb = colourToRgb(colour);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    const textColour = brightness > 128 ? 'black' : 'white';

    return {
      label,
      colour,
      textColour,
    };
  });
}

//function to create the wheel
function drawWheel(ctx, segmentData, rotation = 0) {
  const canvasSize = WHEEL_SIZE;
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const radius = canvasSize / 2 - WHEEL_PADDING;
  const arc = (2 * Math.PI) / segmentData.length;

  //solid background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  //spin canvas
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.translate(-centerX, -centerY);

  //create segments for each input option
  segmentData.forEach((segment, i) => {
    const angle = i * arc;

    ctx.fillStyle = segment.colour;

    //draw segment
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arc);
    ctx.closePath();
    ctx.fill();

    //draw text
    ctx.save();

    const textAngle = angle + arc / 2;
    const textDistance = radius * 0.65;

    ctx.translate(
      centerX + Math.cos(textAngle) * textDistance,
      centerY + Math.sin(textAngle) * textDistance
    );

    ctx.rotate(textAngle);

    ctx.fillStyle = segment.textColour;
    ctx.font = 'bold 15px Arial';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(segment.label).width;
    ctx.fillText(segment.label, -textWidth / 2, 0);

    ctx.restore();
  });

  ctx.restore();

  //draw the pointer
  ctx.save();
  ctx.translate(centerX + radius, centerY);

  ctx.beginPath();
  ctx.moveTo(0, -POINTER_SIZE);
  ctx.lineTo(POINTER_SIZE * 2, 0);
  ctx.lineTo(0, POINTER_SIZE);
  ctx.closePath();

  ctx.fillStyle = 'red';
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = 'black';
  ctx.stroke();

  ctx.restore();

  //draw center dot
  ctx.beginPath();
  ctx.arc(centerX, centerY, CENTER_DOT_SIZE, 0, 2 * Math.PI);
  ctx.fillStyle = 'black';
  ctx.fill();
}

//spin the wheel and generate GIF
function spinWheel(ctx, canvas, segmentData) {
  return new Promise((resolve, reject) => {
    const canvasSize = canvas.width;
    const encoder = new GIFEncoder(canvasSize, canvasSize);

    const stream = encoder.createReadStream();
    const chunks = [];

    let finalRotation = 0;

    stream.on('data', (chunk) => chunks.push(chunk));

    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const arc = (2 * Math.PI) / segmentData.length;

      const index = Math.floor(
        ((((0 - finalRotation) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI)) /
          arc
      );

      resolve({
        winner: segmentData[index].label,
        buffer,
      });
    });

    stream.on('error', reject);

    encoder.start();
    encoder.setRepeat(-1); //play once
    encoder.setDelay(Math.round(1000 / GIF_FPS));
    encoder.setQuality(GIF_QUALITY);

    //spin logic
    const startRotation = 0;
    const maxRotation = Math.PI * 6 + Math.random() * Math.PI * 2;

    try {
      for (
        let currentFrame = 0;
        currentFrame < GIF_TOTAL_FRAMES;
        currentFrame++
      ) {
        const t = currentFrame / GIF_TOTAL_FRAMES;
        const easedSpeed = 1 - Math.pow(1 - t, 3); //easeOutCubic
        const rotation = startRotation + maxRotation * easedSpeed;

        finalRotation = rotation;

        drawWheel(ctx, segmentData, rotation);
        encoder.addFrame(ctx);
      }

      encoder.finish();
    } catch (error) {
      reject(error);
    }
  });
}

//colour check
function isValidColor(color) {
  try {
    colourParseCtx.fillStyle = '#ffffff';
    colourParseCtx.fillStyle = color;

    return (
      colourParseCtx.fillStyle !== '#ffffff' ||
      color.toLowerCase() === '#ffffff' ||
      color.toLowerCase() === 'white'
    );
  } catch {
    return false;
  }
}

function normaliseColour(color) {
  colourParseCtx.fillStyle = '#ffffff';
  colourParseCtx.fillStyle = color;

  return colourParseCtx.fillStyle;
}

//convert colour to RGB for brightness calculation
function colourToRgb(color) {
  try {
    colourParseCtx.fillStyle = '#ffffff';
    colourParseCtx.fillStyle = color;

    const computed = colourParseCtx.fillStyle;

    if (computed.startsWith('#')) {
      const hex = computed.replace('#', '');

      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      }

      if (hex.length === 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        };
      }
    }

    if (computed.startsWith('rgb')) {
      const [r, g, b] = computed
        .replace(/[^\d,]/g, '')
        .split(',')
        .map(Number);

      return { r, g, b };
    }
  } catch {
    //fallback below
  }
  return { r: 255, g: 255, b: 255 };
}
