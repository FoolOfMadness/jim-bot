//help command to explain other JimBot commands - This should be updated with each new command
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription("Provides information about JimBot's commands.");

export const execute = async (interaction) => {
  const embed = new EmbedBuilder()
    .setColor('#00a693')
    .setTitle('🧙‍♂️ JimBot Command List 🤖')
    .setDescription('Here are the available commands:')
    .addFields(
      {
        name: '🎉 Fun Commands 🎈',
        value: `
        **/bonk** - Makes a gif of a target user getting hit with a mallet.
        **/headpat** - Makes a gif of a target user getting a headpat.
        **/truth** - Speak it in red or blue.
      `,
      },
      {
        name: '🃏 Gambling Commands 🎲',
        value: `
        **/blackjack** - Play a game of blackjack with JimBot.
        **/coinflip** - Flip a coin or coins.
        **/diceroll** - Roll a die or dice.
        **/magic8ball** - Ask a question & get a response.
      `,
      },
      {
        name: '🔧 Utility Commands 🕰️',
        value: `
        **/info** - Get info about a user or a server.
        **/ping** - Ping to check bot latency.
        **/rot13** - Encode/decode a message with the ROT13 cipher.
        **/server** - Get info about the server.
        **/suggest** - Allows a user to send a private suggestion to Jim.
        **/temperature** - Converts a given temperature into 4 different scales.
        **/timestamp** - Converts the time for a city/timezone to a Discord timestamp.
        **/user** - Get info about when you joined the server.
      `,
      }
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
};
