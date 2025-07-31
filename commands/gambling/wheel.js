//wheel command
import {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} from 'discord.js';
import { createCanvas } from 'canvas';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('wheel')
  .setDescription('Spin a custom wheel!')
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
  //get user input
  const input = interaction.options.getString('options');
  const colourInput = interaction.options.getString('colours') || '';

  //create wheel segments based on input
  const segments = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const colours = colourInput
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  //ensure more than 2 options
  if (segments.length < 2) {
    return interaction.reply({
      content: 'Please provide at least two options.',
    });
  }

  //create canvas
  const canvas = createCanvas(500, 500);
  const ctx = canvas.getContext('2d');
  drawWheel(ctx, segments, colours);

  const buffer = canvas.toBuffer('image/png');
  const attachment = new AttachmentBuilder(buffer, { name: 'wheel.png' });

  //select random
  const result = segments[Math.floor(Math.random() * segments.length)];

  //embed message
  const embed = new EmbedBuilder()
    .setTitle('🎡 Spin the Wheel!')
    .setDescription(`The wheel has spoken... **${result}**!`)
    .setColor(0x00ae86)
    .setImage('attachment://wheel.png')
    .setTimestamp();

  await interaction.reply({ embeds: [embed], files: [attachment] });
};

//function to create the wheel
function drawWheel(ctx, segments, colours = []) {
  //set size
  const canvasSize = 500;
  const centerX = canvasSize / 2;
  const centerY = canvasSize / 2;
  const radius = canvasSize / 2 - 10;
  const arc = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, canvasSize, canvasSize);

  //create segments for each input option
  segments.forEach((label, i) => {
    const angle = i * arc;
    const colour =
      colours[i] || `hsl(${(i * 360) / segments.length}, 100%, 50%)`;
    ctx.fillStyle = colour;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arc);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.translate(
      centerX + Math.cos(angle + arc / 2) * (radius * 0.65),
      centerY + Math.sin(angle + arc / 2) * (radius * 0.65)
    );
    ctx.rotate(angle + arc / 2);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(label, -ctx.measureText(label).width / 2, 0);
    ctx.restore();
  });

  //draw center dot
  ctx.beginPath();
  ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
  ctx.fillStyle = 'black';
  ctx.fill();
}
