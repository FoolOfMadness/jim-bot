//deploy commands to bot
import 'dotenv/config';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

//resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//parse CLI arguments
const argv = yargs(hideBin(process.argv)).parse();

// load environment variables
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

//load commands
const commands = [];
const foldersPath = join(__dirname, 'commands');
const commandFolders = readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = join(foldersPath, folder);
  const commandFiles = readdirSync(commandsPath).filter((file) =>
    file.endsWith('.js')
  );

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

//deploy commands
const rest = new REST().setToken(token);

try {
  console.log(deploymentMessage);
  console.log(
    `Started refreshing ${commands.length} application (/) commands.`
  );

  const data = await rest.put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands }
  );

  console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
  console.error(error);
}
