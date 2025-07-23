//deploy commands to bot
import 'dotenv/config';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

//resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//parse CLI arguments
const argv = yargs(hideBin(process.argv)).parse();

//load environment variables
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
const commandEntries = readdirSync(foldersPath);

for (const entry of commandEntries) {
  const fullPath = join(foldersPath, entry);

  if (statSync(fullPath).isDirectory()) {
    //if file is folder, load commands in directory
    const commandFiles = readdirSync(fullPath).filter((file) =>
      file.endsWith('.js')
    );

    for (const file of commandFiles) {
      const filePath = join(fullPath, file);
      const command = await import(`file://${filePath}`);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      } else {
        console.warn(
          `[WARNING] The command at ${filePath} is missing "data" or "execute".`
        );
      }
    }
  } else if (entry.endsWith('.js')) {
    //if file is command, load directly
    const command = await import(`file://${fullPath}`);
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(
        `[WARNING] The command at ${fullPath} is missing "data" or "execute".`
      );
    }
  }
}

//deploy commands
const rest = new REST({ version: '10' }).setToken(token);

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
