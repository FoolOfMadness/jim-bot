//magic8ball command
import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlagsBitField,
} from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('magic8ball')
  .setDescription('Ask the Magic 8-Ball a question')
  .addStringOption((option) =>
    option
      .setName('question')
      .setDescription('The question you want to ask the Magic 8-Ball')
      .setRequired(true)
  );

//responses
const responses = [
  'Yes!',
  'No!',
  'Maybe? Maybe not...?',
  "I don't know!!",
  "You're not the boss of me!!",
  'Sure.',
  'As I see it, yes.',
  'Most likely.',
  'Outlook good.',
  'Signs point to yes.',
  "I'm getting sleepy, try again.",
  'Ask again later.',
  'Better not tell you now.',
  'Cannot predict now.',
  'Concentrate and ask again.',
  "Don't count on it, buddy.",
  'My reply is no and will forever be no.',
  'My sources say no.',
  'Outlook not so good.',
  'Very doubtful.',
  "It's over.",
  'It could work, who knows.',
  'Congratulations!',
  'Stop shaking me!',
  'Look behind you.',
  "OMG that's crazy!",
  'Okay buddy.',
  "I don't think so pal.",
  'Perhaps...',
  'Mayhaps...',
  '*You* are my buddy 💖',
];

//ask the 8ball
export const execute = async (interaction) => {
  try {
    //get the question from the user
    const question = interaction.options.getString('question');

    //get a random response
    const response = responses[Math.floor(Math.random() * responses.length)];

    //make an embed with the response
    const embed = new EmbedBuilder()
      .setColor('Purple')
      .setTitle('Magic 8-Ball')
      .setThumbnail(interaction.member.displayAvatarURL())
      .setDescription(`🎱 **Question:** ${question}\n **Answer:** ${response}`);

    //send the response
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: 'Something went wrong while consulting the Magic 8-Ball...',
      flags: MessageFlagsBitField.Ephemeral,
    });
  }
};
