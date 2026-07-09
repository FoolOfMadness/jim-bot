//set bot activity status command
import {
  SlashCommandBuilder,
  ActivityType,
  PermissionFlagsBits,
} from 'discord.js';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('activity')
  .setDescription('Set activity (admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
//if not admin message
export const execute = async (interaction) => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Admin only.',
      flags: EPHEMERAL_FLAG,
    });
  }
  await interaction.deferReply({ flags: EPHEMERAL_FLAG });

  //define activity type
  let activity_type = interaction.options.getString('type');
  if (activity_type === 'playing') activity_type = ActivityType.Playing;
  if (activity_type === 'listening') activity_type = ActivityType.Listening;
  if (activity_type === 'watching') activity_type = ActivityType.Watching;
  if (activity_type === 'streaming') activity_type = ActivityType.Streaming;
  if (activity_type === 'competing') activity_type = ActivityType.Competing;

  //set activity
  interaction.client.user.setActivity(
    interaction.options.getString('details'),
    { type: activity_type }
  );

  //confirm
  await interaction.editReply({
    content: 'Activity updated successfully',
  });
};
