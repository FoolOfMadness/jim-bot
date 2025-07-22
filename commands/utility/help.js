//help command to explain other JimBot commands
import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlagsBitField,
} from 'discord.js';

const categoryLabels = {
  fun: '🎉 Fun Commands 🎈',
  gambling: '🃏 Gambling Commands 🎲',
  utility: '🔧 Utility Commands 🕰️',
  mod: '🛠️ Mod Tools 🔐',
  misc: '📦 Miscellaneous',
};

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription("Provides information about JimBot's commands.");

export const execute = async (interaction) => {
  const commands = interaction.client.commands;

  const embed = new EmbedBuilder()
    .setColor('#00a693')
    .setTitle('🧙‍♂️ JimBot Command List 🤖')
    .setDescription('Here are the available commands:');

  const categories = {};

  for (const command of commands.values()) {
    const category = command.category || 'Other';
    if (!categories[category]) categories[category] = [];
    categories[category].push(
      `**/${command.data.name}** – ${command.data.description}`
    );
  }

  for (const [category, cmds] of Object.entries(categories)) {
    const label = categoryLabels[category] || `📁 ${category}`;
    embed.addFields({ name: label, value: cmds.join('\n') });
  }

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlagsBitField.Ephemeral,
  });
};
