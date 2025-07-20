require('dotenv').config();
const argv = require('yargs/yargs')(process.argv.slice(2)).parse();

const { REST, Routes } = require('discord.js');
const { readdirSync } = require('node:fs');
const { join } = require('node:path');

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
let guildId;
let deploymentMessage;
if (argv.deploy) {
  guildId = process.env.MAIN_GUILD_ID;
  deploymentMessage = "Deploying to Nai's server";
} else {
  guildId = process.env.DEV_GUILD_ID;
  deploymentMessage = "Deploying to Jim's Server";
}

const commands = [];
//get command folders
const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

for (const folder of commandFolders) {
  //get command files
  const commandsPath = join(foldersPath, folder);
  const commandFiles = readdirSync(commandsPath).filter((file) =>
    file.endsWith('.js')
  );
  //get SlashCommandBuilder output of each command
  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

//construct REST module
const rest = new REST().setToken(token);

//deploy commands
(async () => {
  try {
    console.log(deploymentMessage);
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    //refresh all commands with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
