#!/usr/bin/env node
/** Сохранить рейтинг башни перед переключением на игру «Прыжок». */
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const src = join(root, 'src', 'content', 'game-scores.json');
const dest = join(root, 'storage', 'game-scores-tower-backup.json');

if (!existsSync(src)) {
	console.error('SKIP: no game-scores.json');
	process.exit(0);
}

await mkdir(join(root, 'storage'), { recursive: true });
await copyFile(src, dest);
console.error(`OK: tower scores backed up to storage/game-scores-tower-backup.json`);
