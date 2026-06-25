//currency command
import { SlashCommandBuilder, MessageFlags } from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('currency')
  .setDescription('Converts currency from one to another')
  .addStringOption((option) =>
    option
      .setName('from')
      .setDescription('Currency to convert from (e.g., USD)')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('to')
      .setDescription('Currency to convert to (e.g., EUR)')
      .setRequired(true)
  )
  .addNumberOption((option) =>
    option
      .setName('amount')
      .setDescription('Amount to convert')
      .setRequired(true)
  );

//convert currency
export const execute = async (interaction) => {
  //make input to uppercase
  const from = interaction.options.getString('from').toUpperCase();
  const to = interaction.options.getString('to').toUpperCase();
  const amount = interaction.options.getNumber('amount');

  await interaction.reply({
    content: 'Converting...',
    flags: MessageFlags.Ephemeral ?? 64,
  });

  try {
    //fetch api
    const response = await fetch(
      `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=${amount}`
    );
    const data = await response.json();

    if (!data.result) {
      throw new Error('Invalid currency code or API error.');
    }

    await interaction.editReply({
      content: `${amount} ${from} = ${data.result.toFixed(2)} ${to}`,
      flags: MessageFlags.Ephemeral ?? 64,
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content: 'Something went wrong, whoops.',
      flags: MessageFlags.Ephemeral ?? 64,
    });
  }
};
