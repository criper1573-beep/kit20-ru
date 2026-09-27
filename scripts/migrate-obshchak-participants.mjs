/**
 * Одноразовая миграция runtime src/content/obshchak.json:
 * убрать взносы ушедших, katya=0, participantSlugs на старых тратах = 9 человек.
 *
 * node scripts/migrate-obshchak-participants.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateObshchakData } from '../src/lib/obshchakRoster.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const obPath = join(root, 'src', 'content', 'obshchak.json');

let raw;
try {
	raw = await readFile(obPath, 'utf8');
} catch (e) {
	if (e && e.code === 'ENOENT') {
		console.log('нет src/content/obshchak.json — нечего мигрировать');
		process.exit(0);
	}
	throw e;
}

const before = JSON.parse(raw);
const dropped = Object.keys(before.contributedKopeks || {}).filter((k) =>
	['anya', 'galya', 'seryozha', 'yulya-1'].includes(k),
);
const droppedAmounts = Object.fromEntries(
	dropped.map((k) => [k, before.contributedKopeks[k]]),
);

const migrated = migrateObshchakData(before);
const out = `${JSON.stringify(migrated, null, 2)}\n`;
await writeFile(obPath, out, 'utf8');

const lkgDir = join(root, 'storage', 'last-known-good');
await mkdir(lkgDir, { recursive: true });
await writeFile(join(lkgDir, 'obshchak.json'), out, 'utf8');

console.log('OK: migrated', obPath);
if (dropped.length) {
	console.log('dropped contributedKopeks:', JSON.stringify(droppedAmounts));
} else {
	console.log('dropped contributedKopeks: none still present');
}
console.log('expenses', migrated.expenses?.length ?? 0);
