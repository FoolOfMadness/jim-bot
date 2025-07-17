//help command to explain other OinkBot commands - This should be updated with each new command
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription("Provides information about OinkBot's commands.");

const execute = async (interaction) => {
  const embed = new EmbedBuilder()
    .setColor('#00a693')
    .setTitle('🧙‍♂️ JimBot Command List 🤖')
    .setDescription('Here are the available commands:')
    .addFields(
      {
        name: '🎉 Fun Commands 🎈',
        value: `
        **/bonk** - Makes a gif of a target user getting hit with a mallet.
        **/gomenasorry** - Prints some predefined apology notes.
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
        **/rot13** - Encode/decode a message with the ROT13 cipher.
        **/suggest** - Allows a user to send a private suggestion to Jim.
        **/temperature** - Converts a given temperature into 4 different scales.
        **/timestamp** - Converts the time for a city/timezone to a Discord timestamp.
      `,
      }
    );

  await interaction.reply({ embeds: [embed], ephemeral: true });
};

module.exports = { data, execute };
