//set bot activity status command
const { SlashCommandBuilder, ActivityType } = require('discord.js');

//name of slash command & description
const data = new SlashCommandBuilder()
  .setName('activity')
  .setDescription('Set activity (developer only)')
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('The type of the activity')
      .setRequired(true)
      .addChoices(
        { name: 'playing', value: 'playing' },
        { name: 'listening to', value: 'listening' },
        { name: 'watching', value: 'watching' },
        { name: 'streaming', value: 'streaming' },
        { name: 'competing in', value: 'competing' }
      )
  )
  //get input activity details
  .addStringOption((option) =>
    option
      .setName('details')
      .setDescription('The details of the activity')
      .setRequired(true)
  );
//if not Jim message
const execute = async (interaction) => {
  if (interaction.user.id != '240246252124504064') {
    await interaction.reply({
      content: "You're not Jim. You will never be Jim.",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  //define activity type
  let activity_type = interaction.options.getString('type');
  if (activity_type === 'playing') activity_type = ActivityType.Playing;
  if (activity_type === 'listening') activity_type = ActivityType.Listening;
  if (activity_type === 'watching') activity_type = ActivityType.Watching;
  if (activity_type === 'streaming') activity_type = ActivityType.Streaming;
  if (activity_type === 'competing') activity_type = ActivityType.Competing;

  interaction.client.user.setActivity(
    interaction.options.getString('details'),
    { type: activity_type }
  );

  //confirm
  await interaction.editReply({
    content: 'Activity updated successfully',
    flags: MessageFlags.Ephemeral,
  });
};

module.exports = { data, execute };
