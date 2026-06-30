//wheel command
import {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} from 'discord.js';
import { createCanvas } from 'canvas';
import GIFEncoder from 'gifencoder';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';
import { lockGif, unlockGif } from '../../utils/gifLock.js';

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
const POINTER_COLOUR = 'red';
const POINTER_OUTLINE = 'black';
const BACKGROUND_COLOUR = '#ffffff';

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
  const input = interaction.options.getString('options');
  const colourInput = interaction.options.getString('colours') || '';

  const segments = parseSegments(input);

  if (segments.length < 2) {
    return interaction.reply({
      content: 'Please provide at least two options.',
      flags: EPHEMERAL_FLAG,
    });
  }

  if (segments.length > MAX_SEGMENTS) {
    return interaction.reply({
      content: `Please provide ${MAX_SEGMENTS} options or fewer.`,
      flags: EPHEMERAL_FLAG,
    });
  }

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
    const colourInputs = colourInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const segmentData = buildSegmentData(segments, colourInputs);

    const { winner, buffer } = await spinWheel(segmentData);

    const attachment = new AttachmentBuilder(buffer, {
      name: 'wheel.gif',
    });

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
    unlockGif(jobId);
  }
};

function parseSegments(input) {
  return input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) =>
      s.length > MAX_LABEL_LENGTH ? `${s.slice(0, MAX_LABEL_LENGTH)}...` : s
    );
}

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
    const brightness = getBrightness(rgb);
    const textColour = brightness > 128 ? 'black' : 'white';

    return {
      label,
      colour,
      textColour,
    };
  });
}

function getBrightness({ r, g, b }) {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

//create the static, unrotated wheel once
function createWheelCanvas(segmentData) {
  const canvas = createCanvas(WHEEL_SIZE, WHEEL_SIZE);
  const ctx = canvas.getContext('2d');

  drawStaticWheel(ctx, segmentData);

  return canvas;
}

//draw the wheel segments
function drawStaticWheel(ctx, segmentData) {
  const centerX = WHEEL_SIZE / 2;
  const centerY = WHEEL_SIZE / 2;
  const radius = WHEEL_SIZE / 2 - WHEEL_PADDING;
  const arc = (2 * Math.PI) / segmentData.length;

  ctx.clearRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);

  segmentData.forEach((segment, index) => {
    const startAngle = index * arc;
    const endAngle = startAngle + arc;

    ctx.fillStyle = segment.colour;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    drawSegmentText(ctx, segment, startAngle, arc, radius);
  });
}

//create the wheel text
function drawSegmentText(ctx, segment, startAngle, arc, radius) {
  const centerX = WHEEL_SIZE / 2;
  const centerY = WHEEL_SIZE / 2;

  const textAngle = startAngle + arc / 2;
  const textDistance = radius * 0.65;

  const textX = centerX + Math.cos(textAngle) * textDistance;
  const textY = centerY + Math.sin(textAngle) * textDistance;

  ctx.save();

  ctx.translate(textX, textY);
  ctx.rotate(textAngle);

  ctx.fillStyle = segment.textColour;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  setBestFitFont(ctx, segment.label, radius * 0.45);

  ctx.fillText(segment.label, 0, 0);

  ctx.restore();
}

//font
function setBestFitFont(ctx, text, maxWidth) {
  let fontSize = 15;

  while (fontSize > 8) {
    ctx.font = `bold ${fontSize}px Arial`;

    if (ctx.measureText(text).width <= maxWidth) {
      return;
    }

    fontSize--;
  }
  ctx.font = 'bold 8px Arial';
}

//draw one complete frame
function drawFrame(ctx, wheelCanvas, rotation) {
  const centerX = WHEEL_SIZE / 2;
  const centerY = WHEEL_SIZE / 2;

  ctx.fillStyle = BACKGROUND_COLOUR;
  ctx.fillRect(0, 0, WHEEL_SIZE, WHEEL_SIZE);

  //rotate only the pre-rendered wheel
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.drawImage(wheelCanvas, -centerX, -centerY);
  ctx.restore();

  drawPointer(ctx);
  drawCenterDot(ctx);
}

//create winner pointer
function drawPointer(ctx) {
  const centerX = WHEEL_SIZE / 2;
  const centerY = WHEEL_SIZE / 2;
  const radius = WHEEL_SIZE / 2 - WHEEL_PADDING;

  ctx.save();

  ctx.translate(centerX + radius, centerY);

  ctx.beginPath();
  ctx.moveTo(0, -POINTER_SIZE);
  ctx.lineTo(POINTER_SIZE * 2, 0);
  ctx.lineTo(0, POINTER_SIZE);
  ctx.closePath();

  ctx.fillStyle = POINTER_COLOUR;
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = POINTER_OUTLINE;
  ctx.stroke();

  ctx.restore();
}

//center dot of wheel
function drawCenterDot(ctx) {
  const centerX = WHEEL_SIZE / 2;
  const centerY = WHEEL_SIZE / 2;

  ctx.beginPath();
  ctx.arc(centerX, centerY, CENTER_DOT_SIZE, 0, 2 * Math.PI);
  ctx.fillStyle = 'black';
  ctx.fill();
}

//spin the wheel and generate GIF
function spinWheel(segmentData) {
  return new Promise((resolve, reject) => {
    const canvas = createCanvas(WHEEL_SIZE, WHEEL_SIZE);
    const ctx = canvas.getContext('2d');

    const wheelCanvas = createWheelCanvas(segmentData);

    const encoder = new GIFEncoder(WHEEL_SIZE, WHEEL_SIZE);
    const stream = encoder.createReadStream();
    const chunks = [];

    stream.on('data', (chunk) => chunks.push(chunk));

    stream.on('end', () => {
      resolve({
        winner: segmentData[winningIndex].label,
        buffer: Buffer.concat(chunks),
      });
    });

    stream.on('error', reject);

    //find winner
    const winningIndex = Math.floor(Math.random() * segmentData.length);
    const finalRotation = getFinalRotationForWinner(
      winningIndex,
      segmentData.length
    );

    encoder.start();
    encoder.setRepeat(-1); //play once
    encoder.setDelay(Math.round(1000 / GIF_FPS));
    encoder.setQuality(GIF_QUALITY);

    //spin for winner
    try {
      for (
        let currentFrame = 0;
        currentFrame < GIF_TOTAL_FRAMES;
        currentFrame++
      ) {
        const t = currentFrame / (GIF_TOTAL_FRAMES - 1);
        const easedProgress = easeOutCubic(t);

        const rotation = finalRotation * easedProgress;

        drawFrame(ctx, wheelCanvas, rotation);
        encoder.addFrame(ctx);
      }

      encoder.finish();
    } catch (error) {
      reject(error);
    }
  });
}

//spinning wheel
function getFinalRotationForWinner(winningIndex, segmentCount) {
  const arc = (2 * Math.PI) / segmentCount;

  //pointer is at angle 0, pointing from centre to the right
  //segment centre should end under the pointer
  const segmentCenterAngle = winningIndex * arc + arc / 2;

  //rotate the winning segment centre to angle 0
  const targetRotation =
    ((2 * Math.PI - segmentCenterAngle) % (2 * Math.PI)) + 2 * Math.PI;

  const fullSpins = 6 * 2 * Math.PI;
  const randomExtraSpins = Math.floor(Math.random() * 3) * 2 * Math.PI;

  return fullSpins + randomExtraSpins + targetRotation;
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
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

//normalise the colour
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
    //fallback
  }
  return { r: 255, g: 255, b: 255 };
}
