//env path manager
import 'dotenv/config';

function requiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function optionalEnv(name, fallback) {
  return process.env[name] || fallback;
}

function optionalEnvArray(name) {
  return (
    process.env[name]
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean) ?? []
  );
}

export const TOKEN = requiredEnv('TOKEN');

export const CLIENT_ID = requiredEnv('CLIENT_ID');

export const DB_PASS = requiredEnv('DB_PASS');

export const MAIN_GUILD_ID = requiredEnv('MAIN_GUILD_ID');

export const DEV_GUILD_ID = optionalEnv('DEV_GUILD_ID');

export const DEV_CHANNEL_ID = requiredEnv('DEV_CHANNEL_ID');

export const MOD_CHANNEL_ID = requiredEnv('MOD_CHANNEL_ID');

export const ANNOUNCEMENT_CHANNEL_IDS = optionalEnvArray(
  'ANNOUNCEMENT_CHANNEL_IDS'
);

export const QOTD_FORUM_CHANNEL_ID = requiredEnv('QOTD_FORUM_CHANNEL_ID');
export const QOTD_TAG_ID = requiredEnv('QOTD_TAG_ID');
export const QOTD_ROLE_ID = requiredEnv('QOTD_ROLE_ID');

export const QOTD_CRON_SCHEDULE = optionalEnv(
  'QOTD_CRON_SCHEDULE',
  '0 0 * * *'
);

export const SCRAN_FORUM_CHANNEL_ID = requiredEnv('SCRAN_FORUM_CHANNEL_ID');
export const SCRAN_TAG_ID = requiredEnv('SCRAN_TAG_ID');

export const TODO_FORUM_CHANNEL_ID = requiredEnv('TODO_FORUM_CHANNEL_ID');
export const TODO_TAG_ID = requiredEnv('TODO_TAG_ID');

export const MONTHLY_CHANNEL_ID = requiredEnv('MONTHLY_CHANNEL_ID');

export const MONTHLY_CRON_SCHEDULE = optionalEnv(
  'MONTHLY_CRON_SCHEDULE',
  '0 0 1 * *'
);

export const DEBUG = requiredEnv('DEBUG');
