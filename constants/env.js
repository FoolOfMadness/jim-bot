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
