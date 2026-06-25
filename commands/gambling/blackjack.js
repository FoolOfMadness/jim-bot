//blackjack game command
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
} from 'discord.js';

//name of slash command & description
export const data = new SlashCommandBuilder()
  .setName('blackjack')
  .setDescription('Play a game of blackjack');

//instantiate arrays
const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const values = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'Jack',
  'Queen',
  'King',
  'Ace',
];

//create the deck
const createDeck = () => {
  let deck = [];
  for (let suit of suits) {
    for (let value of values) {
      deck.push({ value, suit });
    }
  }
  return deck;
};

//shuffle the deck
const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

//get value of hand
const handValue = (hand) => {
  let value = 0;
  let aceCount = 0;
  for (let card of hand) {
    if (['Jack', 'Queen', 'King'].includes(card.value)) {
      value += 10;
    } else if (card.value === 'Ace') {
      aceCount++;
      value += 11;
    } else {
      value += parseInt(card.value);
    }
  }
  //converts ace value when over 21
  while (value > 21 && aceCount > 0) {
    value -= 10;
    aceCount--;
  }
  return value;
};

//toString for displaying card hands
const handToString = (hand) => {
  return hand.map((card) => `${card.value} of ${card.suit}`).join(', ');
};

//create embed
const blackJackEmbed = (
  playerName,
  playerHand,
  jimBot,
  jimHand,
  hideDealer,
  avatarURL
) => {
  //display hands, 1 of JimBot's cards are hidden
  const gameDisplay = hideDealer
    ? `${handToString([jimHand[0]])} and [Hidden]`
    : `${handToString(jimHand)} (Value: ${handValue(jimHand)})`;

  return new EmbedBuilder()
    .setColor('LuminousVividPink')
    .setTitle('🃏 Blackjack Table 🃏')
    .addFields(
      {
        name: `${playerName}'s hand:`,
        value: `${handToString(playerHand)} (Value: ${handValue(playerHand)})`,
      },
      {
        name: `${jimBot}'s hand:`,
        value: gameDisplay,
      }
    )
    .setThumbnail(avatarURL);
};

//start the game
export const execute = async (interaction) => {
  await interaction.reply('Game is starting right now!');

  //declare variables
  const avatarURL = interaction.user.displayAvatarURL();
  let deck = shuffleDeck(createDeck());
  let playerHand = [deck.pop(), deck.pop()];
  let jimHand = [deck.pop(), deck.pop()];
  let playerStand = false;
  let gameOver = false;
  const playerName = interaction.member.displayName;
  const jimBot = interaction.client.user.displayName;

  //buttons
  const btnHit = new ButtonBuilder()
    .setCustomId('hit')
    .setLabel('Hit')
    .setStyle(ButtonStyle.Secondary);

  const btnStand = new ButtonBuilder()
    .setCustomId('stand')
    .setLabel('Stand')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(btnHit, btnStand);

  //game embed
  const embed = blackJackEmbed(
    playerName,
    playerHand,
    jimBot,
    jimHand,
    true,
    avatarURL
  );

  //send embed of blackjack game
  const message = await interaction.followUp({
    embeds: [embed],
    components: [row],
  });

  const interactionFilter = (i) => i.user.id === interaction.member.id;

  //check for blackjack
  if (handValue(playerHand) === 21) {
    await interaction.followUp(`Blackjack! ${playerName} wins!`);
    return;
  }

  //repeat until game is over
  while (!gameOver) {
    const embed = blackJackEmbed(
      playerName,
      playerHand,
      jimBot,
      jimHand,
      true,
      avatarURL
    );

    await message.edit({ embeds: [embed] });

    //hit or stand logic
    if (!playerStand) {
      let action;
      try {
        action = await message.awaitMessageComponent({
          filter: interactionFilter,
          time: 120_000, //2 minute time limit
        });
      } catch (e) {
        //interaction timeout
        await message.edit({ components: [] }); //remove buttons
        return interaction.followUp({
          content: 'You ran out of time to play!',
          flags: MessageFlags.Ephemeral ?? 64,
        }); //exit
      }

      //hit
      if (action.customId === 'hit') {
        playerHand.push(deck.pop());
        //updated embed
        const updatedEmbed = blackJackEmbed(
          playerName,
          playerHand,
          jimBot,
          jimHand,
          true,
          avatarURL
        );
        //update embed
        await action.update({ embeds: [updatedEmbed] });

        //bust check
        if (handValue(playerHand) > 21) {
          await interaction.followUp(`Bust! ${playerName} loses.`);
          gameOver = true;
        }

        //stand
      } else if (action.customId === 'stand') {
        await action.update({ components: [] });
        playerStand = true;
      }
    } else {
      //JimBot hits on 16, stands on 17
      while (handValue(jimHand) < 17) {
        jimHand.push(deck.pop());
      }
      //final embed
      const finalEmbed = blackJackEmbed(
        playerName,
        playerHand,
        jimBot,
        jimHand,
        false,
        avatarURL
      );
      //update with final embed
      await message.edit({ embeds: [finalEmbed], components: [] });

      //determine outcome logic
      const playerTotal = handValue(playerHand);
      const jimTotal = handValue(jimHand);

      if (jimTotal > 21) {
        await interaction.followUp(`${jimBot} busts! ${playerName} wins!`);
      } else if (jimTotal > playerTotal) {
        await interaction.followUp(`${jimBot} wins!`);
      } else if (jimTotal < playerTotal) {
        await interaction.followUp(`${playerName} wins!`);
      } else {
        await interaction.followUp(`It's a draw! ${jimBot} wins by default.`);
      }
      gameOver = true;
    }
  }
};
