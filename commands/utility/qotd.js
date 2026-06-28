//question of the day command
import { SlashCommandBuilder, ChannelType } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EPHEMERAL_FLAG } from '../../constants/discordDefinitions.js';

//files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagePath = path.join(__dirname, '../utility/qotd.png');
const statePath = path.join(__dirname, '../../utils/qotdState.json');

//hardcoded garbage
//channel ids
const FORUM_CHANNEL_ID = '1284437249739456557';
const QOTD_TAG_ID = '1517977869857591378';
const QOTD_ROLE_ID = '1517982759451103402';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('qotd')
  .setDescription('Create a new Question of the Day')
  .addStringOption((option) =>
    option
      .setName('question')
      .setDescription('The question to post')
      .setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('option1').setDescription('Poll option 1')
  )
  .addStringOption((option) =>
    option.setName('option2').setDescription('Poll option 2')
  )
  .addStringOption((option) =>
    option.setName('option3').setDescription('Poll option 3')
  )
  .addStringOption((option) =>
    option.setName('option4').setDescription('Poll option 4')
  );

//qotd
export const execute = async (interaction) => {
  try {
    //don't expire
    await interaction.deferReply({ flags: EPHEMERAL_FLAG });

    //check if it's been a day since last qotd
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const today = new Date().toISOString().split('T')[0];

    //one per day
    if (state.lastDate === today) {
      return interaction.editReply(
        '⏳ A QOTD has already been posted today.\nNext one unlocks at 00:00 UTC.'
      );
    }

    //increment qotd number
    const questionNumber = state.lastQuestionNumber + 1;

    //get question
    const question = interaction.options.getString('question');
    //get options
    const pollOptions = [
      interaction.options.getString('option1'),
      interaction.options.getString('option2'),
      interaction.options.getString('option3'),
      interaction.options.getString('option4'),
    ].filter(Boolean);

    //autopoll with 2 or more options
    const isPoll = pollOptions.length >= 2;

    //forum channel
    const forum = interaction.client.channels.cache.get(FORUM_CHANNEL_ID);

    if (!forum || forum.type !== ChannelType.GuildForum) {
      return interaction.reply({
        content: '❌ QOTD forum channel not found.',
        flags: EPHEMERAL_FLAG,
      });
    }

    //thread title
    const threadName = `Question of the Day #${questionNumber} • ${
      isPoll ? 'Poll' : 'Discussion'
    }`;

    //create forum post
    const thread = await forum.threads.create({
      name: threadName,
      appliedTags: [QOTD_TAG_ID],
      autoArchiveDuration: 1440, //24 hours
      message: {
        content: `<@&${QOTD_ROLE_ID}>
# Question of the Day #${questionNumber}
        ${question}
        Reply below with your answer!`,
        files: [imagePath], //qotd image
      },
    });

    //followup poll message
    if (isPoll) {
      await thread.send({
        poll: {
          question: {
            text: question,
          },
          answers: pollOptions.map((opt) => ({
            text: opt,
          })),
          duration: 24, //1 day poll
          allowMultiselect: false,
        },
      });
    }

    //update qotdState
    state.lastDate = today;
    state.lastQuestionNumber = questionNumber;
    state.lastThreadId = thread.id;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    //confirmation message
    await interaction.editReply({
      content:
        `✅ Created **QOTD #${questionNumber}** ` +
        (isPoll ? 'with a poll!' : '!'),
      flags: EPHEMERAL_FLAG,
    });
  } catch (error) {
    console.error(error);
    //fail message
    await interaction.editReply({
      content: '❌ Failed to create QOTD.',
      flags: EPHEMERAL_FLAG,
    });
  }
};
