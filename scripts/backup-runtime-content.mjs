#!/usr/bin/env node
/**
 * Ежедневный бэкап runtime-данных (cron на VPS).
 * node scripts/backup-runtime-content.mjs
 */
import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { metricsFromRaw } from './obshchak-guard.mjs';

const root = process.cwd();
const day = new Date().toISOString().slice(0, 10);
const dest = join(root, 'storage', 'runtime-backups', day);
const KEEP_DAYS = 60;

const FILES = [
	'src/content/obshchak.json',
	'src/content/home.md',
	'storage/birthday-dial-labels.json',
	'src/content/game-scores.json',
];

await mkdir(dest, { recursive: true });

let copied = 0;
for (const rel of FILES) {
	const src = join(root, rel);
	if (!existsSync(src)) continue;
	const name = rel.includes('/') ? rel.split('/').pop() : rel;
	await copyFile(src, join(dest, name));
	copied++;
}

// admin-change-log + uploads
try {
	const upSrc = join(root, 'storage', 'uploads');
	const upDest = join(dest, 'uploads');
	if (existsSync(upSrc)) {
		const { cp } = await import('node:fs/promises');
		await cp(upSrc, upDest, { recursive: true });
		copied++;
	}
} catch {
	/* ignore */
}

// admin-change-log
const logRoot = join(root, 'storage', 'admin-change-log');
const logDest = join(dest, 'admin-change-log');
if (existsSync(join(logRoot, 'entries.jsonl'))) {
	await mkdir(logDest, { recursive: true });
	await copyFile(join(logRoot, 'entries.jsonl'), join(logDest, 'entries.jsonl'));
	const snapSrc = join(logRoot, 'snapshots');
	const snapDest = join(logDest, 'snapshots');
	await mkdir(snapDest, { recursive: true });
	try {
		const snaps = await readdir(snapSrc);
		const obSnaps = snaps.filter((f) => f.endsWith('.json')).sort().slice(-50);
		for (const f of obSnaps) {
			await copyFile(join(snapSrc, f), join(snapDest, f));
		}
	} catch {
		/* no snapshots */
	}
	copied++;
}

// Обновить last-known-good если текущий obshchak богаче
const obPath = join(root, 'src/content/obshchak.json');
if (existsSync(obPath)) {
	const { readFile } = await import('node:fs/promises');
	const raw = await readFile(obPath, 'utf8');
	const m = metricsFromRaw(raw);
	if (m && !m.isEmpty) {
		const lkgDir = join(root, 'storage', 'last-known-good');
		await mkdir(lkgDir, { recursive: true });
		await writeFile(join(lkgDir, 'obshchak.json'), raw.endsWith('\n') ? raw : `${raw}\n`, 'utf8');
	}
}

// Ротация
const rtRoot = join(root, 'storage', 'runtime-backups');
try {
	const dirs = (await readdir(rtRoot)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
	for (const old of dirs.slice(0, Math.max(0, dirs.length - KEEP_DAYS))) {
		await rm(join(rtRoot, old), { recursive: true, force: true });
	}
} catch {
	/* ignore */
}

console.error(`OK: runtime backup ${day}, items=${copied}`);
