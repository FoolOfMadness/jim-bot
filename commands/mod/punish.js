//punish related commands
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  EmbedBuilder,
  MessageFlagsBitField,
} from 'discord.js';
import { chooseWithProbabilities } from '../../randomUtil.js';
import { gomenasorry } from '../fun/gomenasorry.js';

//name of slash commands, subcommands, & descriptions
export const data = new SlashCommandBuilder()
  .setName('punish')
  .setDescription('Punish a disobedient buddy.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('one')
      .setDescription('Punish one person.')
      .addUserOption((option) =>
        option
          .setName('target')
          .setDescription('The evildoer to punish')
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName('duration')
          .setDescription('Duration of time out in seconds (60s default)')
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('many')
      .setDescription('Punish many people at once')
      .addIntegerOption((option) =>
        option
          .setName('duration')
          .setDescription('Duration of time out in seconds')
          .setRequired(true)
      )
      .addUserOption((option) =>
        option
          .setName('target1')
          .setDescription('The evildoer to punish')
          .setRequired(true)
      )
      .addUserOption((option) =>
        option.setName('target2').setDescription('The evildoer to punish')
      )
      .addUserOption((option) =>
        option.setName('target3').setDescription('The evildoer to punish')
      )
      .addUserOption((option) =>
        option.setName('target4').setDescription('The evildoer to punish')
      )
      .addUserOption((option) =>
        option.setName('target5').setDescription('The evildoer to punish')
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('extreme')
      .setDescription('Only for the worst offenders, use with care.')
      .addUserOption((option) =>
        option
          .setName('target')
          .setDescription('The evil person to punish')
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName('duration')
          .setDescription('Duration of the timeout in seconds (60s default)')
      )
      .addIntegerOption((option) =>
        option
          .setName('time')
          .setDescription(
            'How much time they have to type in seconds (150s default)'
          )
      )
  );

//extreme punish with variants for the message
const extremePunish = async (channel, target, duration, timeInSeconds) => {
  const instructions = [
    "use the buttons below to type out 'gomenasorry'. Good luck!",
    'use the buttons below to type out the gomenasorry buddies message. This is a rare variant! Good luck!',
    'use the buttons below to type out the UWU-ified gomenasorry message. This is an ultra rare variant! Good luck!',
  ];

  //combine gomenasorry with instructions
  const gomens = gomenasorry.map((message, index) => [
    message,
    instructions[index] || '',
  ]);

  //chooses the variant based on chosen probability
  const choice = chooseWithProbabilities(gomens, [
    [1, 70],
    [71, 90],
    [91, 100],
  ]);
  const [gomen, displayText] = choice;

  //create interactive buttons
  let letters = [...new Set(gomen.split(''))];
  const buttons = letters.map((letter) => {
    let id = letter === ' ' ? 'space' : letter.toLowerCase();
    return new ButtonBuilder()
      .setCustomId(id)
      .setLabel(letter.toUpperCase())
      .setStyle(ButtonStyle.Secondary);
  });

  const rows = [];

  //set buttons size
  const chunkSize = 5;
  for (let i = 0; i < buttons.length; i += chunkSize) {
    const chunk = buttons.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const row = new ActionRowBuilder().addComponents(...chunk);
    rows.push(row);
  }

  let secondsLeft = timeInSeconds;

  //display time left
  let text = `Hey, ${target}, ${displayText}\nTime left: ${secondsLeft} seconds\n`;

  //embed interaction
  let embed = new EmbedBuilder()
    .setTitle('Extreme Punish')
    .setColor('#ff6da0')
    .setDescription(text)
    .setTimestamp();

  const response = await channel.send({
    content: `${target}`,
    embeds: [embed],
    components: [...rows],
  });

  const filter = (i) => i.user.id === target.id;

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: secondsLeft * 1000,
    filter: filter,
  });

  let gomenText = '';

  const updateTime = 5;

  //update to reflect changes
  const intervalId = setInterval(async () => {
    secondsLeft -= updateTime;
    text = text.replace(/(\d+)(?= seconds)/, `${secondsLeft}`);
    embed.setDescription(text);
    try {
      await response.edit({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return;
    }
  }, updateTime * 1000);

  const timeoutId = setTimeout(
    () => clearInterval(intervalId),
    (secondsLeft - 1) * 1000
  );

  //add progress to message
  collector.on('collect', async (i) => {
    const clickedChar = i.customId === 'space' ? ' ' : i.customId.toLowerCase();

    gomenText += clickedChar;
    text += clickedChar;
    embed.setDescription(text);
    await i.update({ embeds: [embed] });

    //stop with failure
    if (!gomen.toLowerCase().startsWith(gomenText.toLowerCase())) {
      collector.stop('failure');
    }
    //success message
    if (gomenText.toLowerCase() === gomen.toLowerCase()) {
      collector.stop('success');
      await channel.send(
        `Congratulations, ${target}, you live to see another day.`
      );
    }
  });

  collector.on('ignore', async (i) => {
    //when an interaction is ignored
  });

  //command finished reply & timeout logic
  collector.on('end', async (collected, reason) => {
    clearTimeout(timeoutId);
    clearInterval(intervalId);
    if (reason !== 'success') {
      if (reason === 'failure') {
        await response.reply(`You messed up, ${target}, delete yourself.`);
      } else {
        await response.reply(`You were too late, ${target}, delete yourself.`);
      }
      if (target.manageable || target.moderatable) {
        await target.timeout(duration, 'Failed to apologise');
      }
    }
    await response.edit({ components: [] });
  });
};

export const execute = async (interaction) => {
  //punish many logic
  const gomen = gomenasorry[0];
  const timeout_duration =
    (interaction.options.getInteger('duration') ?? 60) * 1000;
  if (interaction.options.getSubcommand() === 'many') {
    await interaction.deferReply({});
    const targets = [];

    for (let i = 1; i < 6; i++) {
      if (interaction.options.getMember(`target${i}`))
        targets.push(interaction.options.getMember(`target${i}`));
    }

    let punishMessage = 'Hey, ';

    let validTargets = [];

    targets.forEach(async (target) => {
      if (!target.manageable || !target.moderatable) {
        console.log(`Skipping: ${target}`);
      } else {
        validTargets.push(target);
      }
    });

    //alert user of the punish command so they interact
    punishMessage += validTargets.join(', ');
    punishMessage +=
      "! It's time for you to apologise!\n\nYou have one minute to send a proper apology in this channel.\n\nAny other message but the full gomenasorry text will get you timed out!";
    await interaction.followUp(punishMessage);

    const filter = (m) => {
      const targetIds = validTargets.map((t) => t.id);
      if (m.channel.id != interaction.channelId) return false;
      return targetIds.includes(m.member.id);
    };

    let repliedMap = {};

    validTargets.forEach((t) => {
      repliedMap[t.id] = false;
    });

    interaction.channel
      .awaitMessages({
        filter,
        max: validTargets.length,
        time: 60_000,
        errors: ['time'],
      })
      //success/failure logic
      .then(async (collected) => {
        collected.each(async (msg) => {
          repliedMap[msg.member.id] = true;
          if (msg.content.toLowerCase() === gomen.toLowerCase()) {
            await msg.reply(`You're off the hook for now, buddy.`);
          } else {
            await msg.reply(
              `You have failed to apologise. Time for a little timeout.`
            );
            try {
              await msg.member.timeout(timeout_duration, 'Failed to apologise');
            } catch (e) {
              console.log(e);
            }
          }
        });
      })
      .catch(async (collected) => {
        validTargets.forEach(async (t) => {
          if (!repliedMap[t.id]) {
            await interaction.channel.send(
              `You were too late, <@${t.id}>. Get timed out!`
            );
            try {
              await t.timeout(timeout_duration, 'Failed to apologise');
            } catch (e) {
              console.log(e);
            }
          }
        });
      });
  } else if (interaction.options.getSubcommand() === 'one') {
    await interaction.deferReply({ flags: MessageFlagsBitField.Ephemeral });
    const target = interaction.options.getMember('target');

    //check if can timeout user
    if (!target.manageable || !target.moderatable) {
      await interaction.editReply(
        "I don't have permission to timeout this user 😒"
      );
      return;
    }

    //tell user about the punish
    await interaction.channel.send(
      `Hey, <@${target.id}>! It's time for you to apologise!\n\nYou have one minute to send a proper apology in this channel.\n\nAny other message but the full gomenasorry text will get you timed out!`
    );

    const filter = (m) => m.member.id === target.id;
    let replied = false;

    //message for when punish command finishes
    interaction.channel
      .awaitMessages({ filter, max: 1, time: 60_000, errors: ['time'] })
      .then(async (collected) => {
        const msg = collected.first();
        replied = true;
        if (msg.content.toLowerCase() === gomen.toLowerCase()) {
          await msg.reply(`You're off the hook for now, buddy.`);
        } else {
          await msg.reply(
            `You have failed to apologise. Time for a little timeout.`
          );
          try {
            await target.timeout(timeout_duration, 'Failed to apologise');
          } catch (e) {
            console.log(e);
          }
        }
      })
      //failed message & timeout user
      .catch(async (collected) => {
        if (!replied) {
          await interaction.channel.send(
            `You were too late, <@${target.id}>. Get timed out!`
          );
          try {
            await target.timeout(timeout_duration, 'Failed to apologise');
          } catch (e) {
            console.log(e);
          }
        }
      });

    //reply message when command starts
    await interaction.editReply("It's done, boss.");
  } else if (interaction.options.getSubcommand() == 'extreme') {
    await interaction.deferReply({ flags: MessageFlagsBitField.Ephemeral });
    const target = interaction.options.getMember('target');
    const timeInSeconds = interaction.options.getInteger('time') ?? 150;
    await extremePunish(
      interaction.channel,
      target,
      timeout_duration,
      timeInSeconds
    );
    await interaction.editReply('Firing Destroy Beam!');
  }
};

export { extremePunish };
