//wheel command
import {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  MessageFlagsBitField,
} from 'discord.js';
import { createCanvas } from 'canvas';
import GIFEncoder from 'gifencoder';

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

  //create wheel segments based on input
  const segments = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const colours = colourInput
    .split(',')
    .map((c, i) => c.trim())
    .filter(Boolean)
    .map((c, i) =>
      isValidColor(c) ? c : `hsl(${(i * 360) / segments.length}, 100%, 50%)`
    );

  //ensure more than 2 options
  if (segments.length < 2) {
    return interaction.reply({
      content: 'Please provide at least two options.',
      flags: MessageFlagsBitField.Ephemeral,
    });
  }

  await interaction.deferReply(); //prevent timeout

  //create canvas
  const canvas = createCanvas(500, 500);
  const ctx = canvas.getContext('2d');

  //select winner when wheel is finished spinning
  const { winner, buffer } = await spinWheel(ctx, canvas, segments, colours);

  const attachment = new AttachmentBuilder(buffer, { name: 'wheel.gif' });

  //embed message
  const embed = new EmbedBuilder()
    .setTitle('🎡 Spinning the Wheel!')
    .setDescription(`The wheel has spoken... **${winner}**!`)
    .setColor(0x00ae86)
    .setImage('attachment://wheel.gif')
    .setTimestamp();

  await interaction.editReply({ embeds: [embed], files: [attachment] });
};

//function to create the wheel
function drawWheel(ctx, segments, colours = [], rotation = 0) {
  const canvasSize = 500;
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const radius = canvasSize / 2 - 10;
  const arc = (2 * Math.PI) / segments.length;

  //solid background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  //spin canvas
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.translate(-centerX, -centerY);

  //create segments for each input option
  segments.forEach((label, i) => {
    const angle = i * arc;
    const colour =
      colours[i] || `hsl(${(i * 360) / segments.length}, 100%, 50%)`;
    ctx.fillStyle = colour;

    //draw segment
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arc);
    ctx.closePath();
    ctx.fill();

    //draw text
    ctx.save();
    const textAngle = angle + arc / 2;
    ctx.translate(
      centerX + Math.cos(textAngle) * (radius * 0.65),
      centerY + Math.sin(textAngle) * (radius * 0.65)
    );
    ctx.rotate(textAngle);

    //dynamic text color
    const rgb = hexToRgb(colour);
    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    ctx.fillStyle = brightness > 128 ? 'black' : 'white';

    ctx.font = 'bold 16px Arial';
    ctx.fillText(label, -ctx.measureText(label).width / 2, 0);
    ctx.restore();
  });

  ctx.restore(); //reset rotation

  //draw the pointer
  ctx.save();
  ctx.translate(centerX + radius, centerY); //right edge of wheel

  ctx.beginPath();
  ctx.moveTo(0, -15); //tip of pointer
  ctx.lineTo(30, 0); //back bottom corner
  ctx.lineTo(0, 15); //back top corner
  ctx.closePath();

  ctx.fillStyle = 'red'; //fill with red
  ctx.fill();

  ctx.lineWidth = 3; //outline width
  ctx.strokeStyle = 'black'; //black outline
  ctx.stroke();

  ctx.restore();

  //draw center dot
  ctx.beginPath();
  ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
  ctx.fillStyle = 'black';
  ctx.fill();
}

//spin the wheel and generate GIF
function spinWheel(ctx, canvas, segments, colours) {
  return new Promise((resolve) => {
    const canvasSize = canvas.width;
    const encoder = new GIFEncoder(canvasSize, canvasSize);
    encoder.start();
    encoder.setRepeat(-1); //play once
    encoder.setDelay(40); //~25 FPS
    encoder.setQuality(10);
    encoder.setTransparent(true);

    const stream = encoder.createReadStream();
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const arc = (2 * Math.PI) / segments.length;
      const index = Math.floor(
        ((((0 - finalRotation) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI)) /
          arc
      );
      resolve({ winner: segments[index], buffer });
    });

    //spin logic
    const totalFrames = 60;
    let currentFrame = 0;
    const startRotation = 0;
    const maxRotation = Math.PI * 6 + Math.random() * Math.PI * 2;
    let finalRotation = 0;

    function animate() {
      if (currentFrame < totalFrames) {
        const t = currentFrame / totalFrames;
        const easedSpeed = 1 - Math.pow(1 - t, 3); //easeOutCubic
        const rotation = startRotation + maxRotation * easedSpeed;
        finalRotation = rotation;

        drawWheel(ctx, segments, colours, rotation);
        encoder.addFrame(ctx);
        currentFrame++;
        setImmediate(animate);
      } else {
        encoder.finish();
      }
    }

    animate();
  });
}

function isValidColor(color) {
  const ctx = createCanvas(1, 1).getContext('2d');
  try {
    ctx.fillStyle = color;
    return true;
  } catch {
    return false;
  }
}

//convert colour to RGB for brightness calculation
function hexToRgb(color) {
  try {
    const ctx = createCanvas(1, 1).getContext('2d');
    ctx.fillStyle = '#ffffff'; //fallback
    ctx.fillStyle = color;
    const computed = ctx.fillStyle;

    if (computed.startsWith('#')) {
      const hex = computed.replace('#', '');
      let r, g, b;

      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }

      return { r, g, b };
    }

    //if canvas parsed into rgb string, extract those values
    if (computed.startsWith('rgb')) {
      const [r, g, b] = computed
        .replace(/[^\d,]/g, '')
        .split(',')
        .map(Number);
      return { r, g, b };
    }
  } catch (err) {
    //fallback in case of any parsing error
  }

  return { r: 255, g: 255, b: 255 }; //default: white
}
