//temperature conversion command
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';
import { convertTemperature } from '../../utils/convertTemperature.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('temperature')
  .setDescription('Convert temperature between different scales')
  .addNumberOption((option) =>
    option
      .setName('value')
      .setDescription('Temperature value to convert')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('unit')
      .setDescription('Unit of the temperature value')
      .setRequired(true)
      .addChoices(
        { name: 'Celsius', value: 'C' },
        { name: 'Fahrenheit', value: 'F' },
        { name: 'Kelvin', value: 'K' },
        { name: 'Rankine', value: 'R' }
      )
  );

//convert the temperature
export const execute = async (interaction) => {
  try {
    //declare variables, get user inputs
    const value = interaction.options.getNumber('value');
    const unit = interaction.options.getString('unit');

    //convert with util
    const { celsius, fahrenheit, kelvin, rankine } = convertTemperature(
      value,
      unit
    );

    //make an embed with the conversion
    const embed = new EmbedBuilder()
      .setColor('DarkOrange')
      .setTitle('🔥 Temperature Scales ❄️')
      .setThumbnail(interaction.member.displayAvatarURL())
      .addFields(
        { name: 'Celsius', value: `${celsius.toFixed(2)}°C`, inline: true },
        {
          name: 'Fahrenheit',
          value: `${fahrenheit.toFixed(2)}°F`,
          inline: true,
        },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Kelvin', value: `${kelvin.toFixed(2)}K`, inline: true },
        { name: 'Rankine', value: `${rankine.toFixed(2)}°R`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true }
      );

    //send the conversion
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Something went wrong while converting the temperature...',
      flags: EPHEMERAL_FLAG,
    });
  }
};
