//wordle start button handler
import {
  ChannelType,
  ThreadAutoArchiveDuration,
  EmbedBuilder,
} from 'discord.js';
import {
  loadWordleState,
  saveWordleState,
  cleanDisplayName,
  createPlayerState,
  getWordDisplay,
  updateDailyWordlePost,
} from '#utils/wordleUtils';
import { WORDLE_GAME_CHANNEL_ID, WORDLE_ROLE_ID } from '#constants/env';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';

//start button
export async function handleWordleStart(interaction) {
  try {
    //ignore non-buttons
    if (!interaction.isButton()) return;

    //ignore other buttons
    if (interaction.customId !== 'wordle_start') {
      return;
    }
    //defer reply to avoid timeout
    await interaction.deferReply({
      flags: EPHEMERAL_FLAG,
    });
    const state = loadWordleState();
    if (!state.answer) {
      return interaction.editReply({
        content: '❌ There is no active Wordle right now.',
      });
    }
    const userId = interaction.user.id;
    //check wordle role
    if (!interaction.member.roles.cache.has(WORDLE_ROLE_ID)) {
      return interaction.editReply({
        content: '❌ You need the Wordle role to play Wordle.',
        flags: EPHEMERAL_FLAG,
      });
    }
    //check for active game today
    const existingPlayer = state.players?.[userId];

    if (
      existingPlayer?.threadId &&
      existingPlayer.wordNumber === state.wordNumber &&
      !existingPlayer.completed
    ) {
      try {
        const thread = await interaction.guild.channels.fetch(
          existingPlayer.threadId
        );
        return interaction.editReply({
          content: `🎮 You already have an active Wordle:\n${thread}`,
          flags: EPHEMERAL_FLAG,
        });
      } catch {
        //thread already deleted
      }
    }

    //wordle game channel
    const gameChannel = await interaction.guild.channels.fetch(
      WORDLE_GAME_CHANNEL_ID
    );

    //use displayname of user
    const displayName = cleanDisplayName(
      interaction.member,
      interaction.user.username
    );
    //set thread name
    const threadName = `${displayName} - Wordle #${state.wordNumber}`.slice(
      0,
      100
    );

    //create private thread
    const playerThread = await gameChannel.threads.create({
      name: threadName,
      type: ChannelType.PrivateThread,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      invitable: false,
      reason: `Wordle game for ${interaction.user.tag}`,
    });

    //add player to thread
    try {
      await playerThread.members.add(interaction.user.id);
    } catch (err) {
      console.error('Failed adding player to Wordle thread:', err);

      return interaction.editReply({
        content:
          '❌ I could not add you to your Wordle thread. Please make sure you have the Wordle role.',
        flags: EPHEMERAL_FLAG,
      });
    }

    //start game message
    const wordLengthDisplay = getWordDisplay(state.answer);
    const gameEmbed = new EmbedBuilder()
      .setTitle(`🎮 Daily Wordle #${state.wordNumber}`)
      .setDescription(
        [
          `Welcome <@${interaction.user.id}>!`,
          '',
          `\`${wordLengthDisplay}\``,
          '',
          `**${state.answer.length} letters**`,
          '',
          'You have **6 attempts**.',
          '',
          '🟩 Correct letter',
          '🟨 Wrong position',
          '⬛ Not in word',
        ].join('\n')
      )
      .setColor('Green');

    const gameMessage = await playerThread.send({
      embeds: [gameEmbed],
    });

    //register player in state
    state.players ??= {};
    state.players[userId] = createPlayerState({
      interaction,
      threadId: playerThread.id,
      messageId: gameMessage.id,
      displayName,
      wordNumber: state.wordNumber,
    });
    saveWordleState(state);

    //update daily post
    await updateDailyWordlePost(interaction.client, state);

    //confirm create
    await interaction.editReply({
      content: `🎮 Your Wordle thread is ready:\n${playerThread}`,
    });
  } catch (err) {
    console.error('Wordle start failed:', err);
    //fail message
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: '❌ Failed to start Wordle.',
      });
    } else {
      await interaction.reply({
        content: '❌ Failed to start Wordle.',
        flags: EPHEMERAL_FLAG,
      });
    }
  }
}
