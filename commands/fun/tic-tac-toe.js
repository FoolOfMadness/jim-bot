//tic-tac-toe command
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
  .setName('tictactoe')
  .setDescription('Play a game of tic-tac-toe')
  .addUserOption((option) =>
    option
      .setName('opponent')
      .setDescription('The person you want to play against')
      .setRequired(true)
  );

//winning games array
const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

//check if game won
const checkWinner = (board) => {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;

    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every((cell) => cell !== null)) {
    return 'draw';
  }

  return null;
};

//cells
const createBoardComponents = (board, gameOver = false) => {
  const rows = [];

  for (let row = 0; row < 3; row++) {
    const actionRow = new ActionRowBuilder();

    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      const cell = board[index];

      //buttons
      const button = new ButtonBuilder()
        .setCustomId(`ttt_${index}`)
        .setLabel(cell ?? '')
        .setStyle(
          cell === 'X'
            ? ButtonStyle.Primary
            : cell === 'O'
              ? ButtonStyle.Danger
              : ButtonStyle.Secondary
        )
        .setDisabled(cell !== null || gameOver);

      actionRow.addComponents(button);
    }

    rows.push(actionRow);
  }

  return rows;
};

//embed builder
const createGameEmbed = (
  playerX,
  playerO,
  currentPlayer,
  board,
  result = null
) => {
  const boardDisplay = board
    .map((cell) => cell ?? '⬜')
    .reduce((rows, cell, index) => {
      if (index % 3 === 0) rows.push([]);
      rows[rows.length - 1].push(cell);
      return rows;
    }, [])
    .map((row) => row.join(' '))
    .join('\n');

  let status;

  if (result === 'draw') {
    status = 'The game ended in a draw!';
  } else if (result === 'X') {
    status = `${playerX} wins!`;
  } else if (result === 'O') {
    status = `${playerO} wins!`;
  } else {
    status = `${currentPlayer}'s turn`;
  }

  return new EmbedBuilder()
    .setColor('LuminousVividPink')
    .setTitle('⭕ Tic-Tac-Toe ❌')
    .setDescription(
      `**${playerX}** = X\n` +
        `**${playerO}** = O\n\n` +
        `**Board:**\n${boardDisplay}\n\n` +
        `**Status:** ${status}`
    );
};

//play the game
export const execute = async (interaction) => {
  const opponent = interaction.options.getUser('opponent');

  if (opponent.bot) {
    return interaction.reply({
      content: 'You cannot play tic-tac-toe against a bot.',
      flags: MessageFlags.Ephemeral ?? 64,
    });
  }

  if (opponent.id === interaction.user.id) {
    return interaction.reply({
      content: 'You cannot play against yourself.',
      flags: MessageFlags.Ephemeral ?? 64,
    });
  }

  //set variables
  const playerX = interaction.user;
  const playerO = opponent;

  let currentPlayer = playerX;
  let currentSymbol = 'X';
  let board = Array(9).fill(null);
  let gameOver = false;

  //embed
  const embed = createGameEmbed(
    playerX.username,
    playerO.username,
    currentPlayer.username,
    board
  );

  const components = createBoardComponents(board);

  const message = await interaction.reply({
    embeds: [embed],
    components,
    fetchReply: true,
  });

  //sets players as X or O
  const filter = (buttonInteraction) => {
    return (
      buttonInteraction.user.id === playerX.id ||
      buttonInteraction.user.id === playerO.id
    );
  };

  //while game running loop
  while (!gameOver) {
    let buttonInteraction;

    try {
      buttonInteraction = await message.awaitMessageComponent({
        filter,
        time: 120_000,
      });
    } catch (error) {
      gameOver = true;

      const timeoutEmbed = new EmbedBuilder()
        .setColor('Grey')
        .setTitle('⭕ Tic-Tac-Toe ❌')
        .setDescription('The game timed out due to inactivity.');

      await message.edit({
        embeds: [timeoutEmbed],
        components: createBoardComponents(board, true),
      });

      return;
    }

    //stop other user's from taking a turn
    if (buttonInteraction.user.id !== currentPlayer.id) {
      await buttonInteraction.reply({
        content: `It is not your turn. It is currently ${currentPlayer.username}'s turn.`,
        flags: MessageFlags.Ephemeral ?? 64,
      });

      continue;
    }

    const index = Number(buttonInteraction.customId.replace('ttt_', ''));

    //if space occupied check
    if (board[index] !== null) {
      await buttonInteraction.reply({
        content: 'That square has already been taken.',
        flags: MessageFlags.Ephemeral ?? 64,
      });

      continue;
    }

    board[index] = currentSymbol;

    //check for winning combo
    const result = checkWinner(board);

    //gameover embed
    if (result) {
      gameOver = true;

      const finalEmbed = createGameEmbed(
        playerX.username,
        playerO.username,
        currentPlayer.username,
        board,
        result
      );

      await buttonInteraction.update({
        embeds: [finalEmbed],
        components: createBoardComponents(board, true),
      });

      return;
    }

    if (currentSymbol === 'X') {
      currentSymbol = 'O';
      currentPlayer = playerO;
    } else {
      currentSymbol = 'X';
      currentPlayer = playerX;
    }

    //update embed
    const updatedEmbed = createGameEmbed(
      playerX.username,
      playerO.username,
      currentPlayer.username,
      board
    );

    await buttonInteraction.update({
      embeds: [updatedEmbed],
      components: createBoardComponents(board),
    });
  }
};
