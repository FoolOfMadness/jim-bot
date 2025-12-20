//help command to explain other JimBot commands
import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlagsBitField,
} from 'discord.js';

//label categories
const categoryLabels = {
  fun: '🎉 Fun Commands 🎈',
  gambling: '🃏 Gambling Commands 🎲',
  misc: '📦 Miscellaneous',
  mod: '🛠️ Mod Tools 🔐',
  utility: '🔧 Utility Commands 🕰️',
};

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription("Provides information about JimBot's commands");

export const execute = async (interaction) => {
  //get list of commands
  const commands = interaction.client.commands;

  //create embed
  const embed = new EmbedBuilder()
    .setColor('#00a693')
    .setTitle('🧙‍♂️ JimBot Command List 🤖')
    .setDescription('Here are the available commands:');

  const categories = {};

  //assign commands to relevent categories
  for (const command of commands.values()) {
    const category = categoryLabels[command.category]
      ? command.category
      : 'misc'; //default to misc
    if (!categories[category]) categories[category] = [];
    categories[category].push(
      `**/${command.data.name}** - ${command.data.description}`
    );
  }

  //assign commands to relevant label
  for (const [category, cmds] of Object.entries(categories)) {
    const label = categoryLabels[category];

    embed.addFields({ name: label, value: cmds.join('\n') });
  }

  //send help message
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlagsBitField.Ephemeral,
  });
};
