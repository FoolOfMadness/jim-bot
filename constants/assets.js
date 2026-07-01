//assets path manager
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function requiredAsset(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required asset: ${filePath}`);
  }
  return filePath;
}

const ASSETS_DIR = path.join(__dirname, '../assets');

export const BG_GIF = requiredAsset(path.join(ASSETS_DIR, 'bg.gif'));

export const BONK_GIF = requiredAsset(path.join(ASSETS_DIR, 'bonk.gif'));

export const MONTHLY_VIDEO = requiredAsset(
  path.join(ASSETS_DIR, 'firstlei.mp4')
);

export const HEADPAT_GIF = requiredAsset(path.join(ASSETS_DIR, 'headpat.gif'));

export const QOTD_IMAGE = requiredAsset(path.join(ASSETS_DIR, 'qotd.jpg'));
