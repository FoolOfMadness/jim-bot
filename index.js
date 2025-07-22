//main
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { Sequelize } from 'sequelize';
import {
  ActivityType,
  Client,
  Collection,
  GatewayIntentBits,
} from 'discord.js';

//resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//environment variables
const TOKEN = process.env.TOKEN;
const DEBUG = process.env.DEBUG === 'true';
const DB_PASS = process.env.DB_PASS;

//client setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  presence: {
    activities: [{ name: '/help', type: ActivityType.Listening }],
  },
});

client.commands = new Collection();
client.cooldowns = new Collection();

//sequelize database
const sequelize = new Sequelize('database', 'admin', DB_PASS, {
  host: 'localhost',
  dialect: 'sqlite',
  logging: DEBUG,
  storage: 'database.sqlite',
});

//banned words
const bannedTable = sequelize.define('regex', {
  regex: {
    type: Sequelize.TEXT,
    unique: true,
  },
  word: Sequelize.STRING,
});

client.bannedTable = bannedTable;

//load commands
const foldersPath = path.join(__dirname, 'commands');

//check file is truly a folder
const commandEntries = fs.readdirSync(foldersPath);

for (const entry of commandEntries) {
  const fullPath = path.join(foldersPath, entry);

  if (fs.statSync(fullPath).isDirectory()) {
    //load commands from inside category folder
    const commandFiles = fs
      .readdirSync(fullPath)
      .filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(fullPath, file);
      const commandModule = await import(`file://${filePath}`);

      if ('data' in commandModule && 'execute' in commandModule) {
        const commandWithCategory = { ...commandModule, category: entry }; //folder name as category
        client.commands.set(commandModule.data.name, commandWithCategory);
      } else {
        console.warn(
          `[WARNING] The command at ${filePath} is missing "data" or "execute".`
        );
      }
    }
  } else if (entry.endsWith('.js')) {
    //direct command file in commands directory
    const commandModule = await import(`file://${fullPath}`);

    if ('data' in commandModule && 'execute' in commandModule) {
      const commandWithCategory = { ...commandModule, category: 'misc' }; //label as misc
      client.commands.set(commandModule.data.name, commandWithCategory);
    } else {
      console.warn(
        `[WARNING] The command at ${fullPath} is missing "data" or "execute".`
      );
    }
  }
}

//load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = await import(`file://${filePath}`);
  if (event.once) {
    if (DEBUG) console.log(`Adding one-time event ${event.name} from ${file}`);
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    if (DEBUG) console.log(`Adding event ${event.name} from ${file}`);
    client.on(event.name, (...args) => event.execute(...args));
  }
}

//start bot
client.login(TOKEN);
