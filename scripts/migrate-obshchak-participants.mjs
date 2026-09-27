/**
 * Миграция runtime src/content/obshchak.json:
 * взносы ушедших → archivedContributedKopeks, katya=0,
 * participantSlugs на старых тратах = исходные 13 (без Кати).
 *
 * node scripts/migrate-obshchak-participants.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateObshchakData, OBSHCHAK_DELETED_CONTRIB_SLUGS } from '../src/lib/obshchakRoster.mjs';

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
const fromLive = Object.fromEntries(
	OBSHCHAK_DELETED_CONTRIB_SLUGS.filter((k) => k in (before.contributedKopeks || {})).map((k) => [
		k,
		before.contributedKopeks[k],
	]),
);

const migrated = migrateObshchakData(before);
const out = `${JSON.stringify(migrated, null, 2)}\n`;
await writeFile(obPath, out, 'utf8');

const lkgDir = join(root, 'storage', 'last-known-good');
await mkdir(lkgDir, { recursive: true });
await writeFile(join(lkgDir, 'obshchak.json'), out, 'utf8');

console.log('OK: migrated', obPath);
console.log('archived from live contributedKopeks:', JSON.stringify(fromLive));
console.log('archivedContributedKopeks:', JSON.stringify(migrated.archivedContributedKopeks || {}));
console.log('expenses', migrated.expenses?.length ?? 0);
