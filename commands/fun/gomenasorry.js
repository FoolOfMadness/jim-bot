//gomenasorry message commands
const { SlashCommandBuilder } = require('discord.js');

//gomenasorry variant messages
const gomenasorry = [
  'Gomenasorry',
  'Gomenasorry buddies, arigathankies',
  'G-gomenasowwy buddies, UwU purrs nuzzles OwO',
];

//name of slash command, description, &  variants
const data = new SlashCommandBuilder()
  .setName('gomenasorry')
  .setDescription('Apologises properly.')
  .addStringOption((option) =>
    option
      .setName('variant')
      .setDescription('The gomenasorry variant')
      .setRequired(true)
      .addChoices(
        { name: 'standard', value: 'standard' },
        { name: 'buddy', value: 'buddy' },
        { name: 'uwu', value: 'uwu' }
      )
  );

//selects variant message based on user input
const execute = async (interaction) => {
  const variant = interaction.options.getString('variant');
  let chosen;
  if (variant === 'standard') {
    chosen = gomenasorry[0];
  } else if (variant === 'buddy') {
    chosen = gomenasorry[1];
  } else if (variant === 'uwu') {
    chosen = gomenasorry[2];
  }
  await interaction.reply(chosen);
};

module.exports = { data, execute, gomenasorry };
