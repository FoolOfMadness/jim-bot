//cipher (ROT13) command
import {
  SlashCommandBuilder,
  MessageFlags,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
} from 'discord.js';

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

//context menu command
export const contextMenuData = new ContextMenuCommandBuilder()
  .setName('ROT13 Encode/Decode')
  .setType(ApplicationCommandType.Message);

//ROT13 encoding/decoding
const rot13 = (str) =>
  str.replace(/[a-zA-Z]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13))
  );

//cipher the text
export const execute = async (interaction) => {
  try {
    let message;
    //slash command
    if (interaction.isChatInputCommand()) {
      message = interaction.options.getString('message');
      //context menu command
    } else if (interaction.isMessageContextMenuCommand()) {
      message = interaction.targetMessage.content;
    }
    //no message content
    if (!message) {
      return await interaction.reply({
        content: 'No message content found to encode/decode.',
        flags: MessageFlags.Ephemeral ?? 64,
      });
    }

    //put message through cipher
    const result = rot13(message);

    //give result
    await interaction.reply({
      content: `🔒 **ROT13 Result:**\n${result}`,
      flags: MessageFlags.Ephemeral ?? 64,
    });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Something went wrong while processing the message...',
      flags: MessageFlags.Ephemeral ?? 64,
    });
  }
};
