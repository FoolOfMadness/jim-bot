//import messageflags
import { MessageFlags } from 'discord.js';
//export custom defined ephemeral, default to API code for ephemeral
export const EPHEMERAL_FLAG = MessageFlags.Ephemeral ?? 64;

//qotd stuff
export const MAX_QUESTION_LENGTH = 300;
export const MAX_OPTION_LENGTH = 55;

export const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
]);

export const ALLOWED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.mp4',
  '.webm',
];
