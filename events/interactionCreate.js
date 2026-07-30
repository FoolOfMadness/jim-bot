import { Events, Collection } from 'discord.js';
import { EPHEMERAL_FLAG } from '#constants/discordDefinitions';
import { handleWordleStart } from '#games/wordleStartButton';

export const name = Events.InteractionCreate;

export async function execute(interaction) {
  //buttons
  if (interaction.isButton()) {
    try {
      await handleWordleStart(interaction);
    } catch (error) {
      console.error('Button error:', error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: '❌ Button failed.',
        });
      } else {
        await interaction.reply({
          content: '❌ Button failed.',
          flags: EPHEMERAL_FLAG,
        });
      }
    }
    return;
  }

  //slash commands/context menus
  if (
    !interaction.isChatInputCommand() &&
    !interaction.isContextMenuCommand()
  ) {
    return;
  }

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  const { cooldowns } = interaction.client;

  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const defaultCooldownDuration = 1;
  const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

    if (now < expirationTime) {
      const expiredTimestamp = Math.round(expirationTime / 1000);

      return interaction.reply({
        content:
          `Please wait, you are on cooldown for \`${command.data.name}\`. ` +
          `You can use it again <t:${expiredTimestamp}:R>.`,
        flags: EPHEMERAL_FLAG,
      });
    }
  }
  timestamps.set(interaction.user.id, now);

  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({
          content: '❌ There was an error while executing this command!',
        });
      } else {
        await interaction.reply({
          content: '❌ There was an error while executing this command!',
          flags: EPHEMERAL_FLAG,
        });
      }
    } catch (replyError) {
      console.error('Failed to send error response:', replyError);
    }
  }
}
