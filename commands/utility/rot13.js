//cipher (ROT13) command
import { SlashCommandBuilder, MessageFlagsBitField } from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('rot13')
  .setDescription('Encode or decode a message using ROT13')
  .addStringOption((option) =>
    option
      .setName('message')
      .setDescription('The message to encode or decode')
      .setRequired(true)
  );

//ROT13 encoding/decoding
const rot13 = (str) => {
  return str.replace(/[A-Za-z]/g, (c) =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.charAt(
      'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm'.indexOf(c)
    )
  );
};

//cipher the text
export const execute = async (interaction) => {
  try {
    //get the user input
    const message = interaction.options.getString('message');

    //put message through cipher
    const result = rot13(message);

    //give result
    await interaction.reply({
      content: `🔒 **ROT13 Result:**\n${result}`,
      flags: MessageFlagsBitField.Ephemeral,
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Something went wrong while processing the message...',
      flags: MessageFlagsBitField.Ephemeral,
    });
  }
};
