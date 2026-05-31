#!/usr/bin/env node
/**
 * Защита runtime-файлов при git pull / деплое.
 *
 *   node scripts/preserve-runtime-on-deploy.mjs --phase=pre-pull
 *   node scripts/preserve-runtime-on-deploy.mjs --phase=post-pull
 *   node scripts/preserve-runtime-on-deploy.mjs --phase=verify
 *
 * Также вызывается из post-merge git hook на сервере.
 */
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	formatMetricsPair,
	isRicher,
	metricsFromFile,
	metricsFromRaw,
} from './obshchak-guard.mjs';

const root = process.cwd();
const DEPLOY_BACKUPS = join(root, 'storage', 'deploy-backups');
const LAST_KNOWN = join(root, 'storage', 'last-known-good');
const MARKER = join(DEPLOY_BACKUPS, '.latest-pre-pull');

const OBSHCHAK = 'src/content/obshchak.json';
const OBSHCHAK_BAK = 'src/content/obshchak.json.bak';
const BIRTHDAY = 'storage/birthday-dial-labels.json';
const GAME_SCORES = 'src/content/game-scores.json';

function rel(p) {
	return join(root, p);
}

function parseArgs() {
	const phase = process.argv.find((a) => a.startsWith('--phase='))?.split('=')[1];
	if (!phase || !['pre-pull', 'post-pull', 'verify'].includes(phase)) {
		console.error('Usage: node scripts/preserve-runtime-on-deploy.mjs --phase=pre-pull|post-pull|verify');
		process.exit(2);
	}
	return phase;
}

async function fileBytes(p) {
	try {
		const s = await stat(p);
		return s.size;
	} catch {
		return 0;
	}
}

async function copyIfExists(from, toDir, name) {
	if (!existsSync(from)) return null;
	await mkdir(toDir, { recursive: true });
	const dest = join(toDir, name);
	await copyFile(from, dest);
	return dest;
}

async function readTextIfExists(p) {
	try {
		return await readFile(p, 'utf8');
	} catch {
		return null;
	}
}

/** @returns {Promise<Array<{ path: string; raw: string; metrics: import('./obshchak-guard.mjs').ObshchakMetrics | null; label: string }>>} */
async function obshchakCandidates() {
	const out = [];
	const entries = [
		[OBSHCHAK, 'текущий'],
		[OBSHCHAK_BAK, '.bak'],
		['storage/last-known-good/obshchak.json', 'last-known-good'],
	];
	for (const [p, label] of entries) {
		const raw = await readTextIfExists(rel(p));
		if (raw) out.push({ path: p, raw, metrics: metricsFromRaw(raw), label });
	}

	try {
		const dirs = await readdir(DEPLOY_BACKUPS);
		const sorted = dirs.filter((d) => /^\d{8}-\d{6}$/.test(d)).sort().reverse();
		for (const d of sorted.slice(0, 15)) {
			const p = join(DEPLOY_BACKUPS, d, 'obshchak.json');
			const raw = await readTextIfExists(p);
			if (raw) out.push({ path: p, raw, metrics: metricsFromRaw(raw), label: `deploy-backup/${d}` });
		}
	} catch {
		/* no backups yet */
	}

	try {
		const rtRoot = join(root, 'storage', 'runtime-backups');
		const days = (await readdir(rtRoot)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
		for (const d of days.slice(0, 14)) {
			const p = join(rtRoot, d, 'obshchak.json');
			const raw = await readTextIfExists(p);
			if (raw) out.push({ path: p, raw, metrics: metricsFromRaw(raw), label: `runtime-backup/${d}` });
		}
	} catch {
		/* no runtime backups */
	}

	return out;
}

async function pickBestObshchak() {
	const candidates = await obshchakCandidates();
	let best = null;
	for (const c of candidates) {
		if (!c.metrics) continue;
		if (!best || isRicher(c.metrics, best.metrics)) best = c;
	}
	return best;
}

async function updateLastKnownGoodFrom(raw) {
	const m = metricsFromRaw(raw);
	if (!m || m.isEmpty) return;
	const dest = rel('storage/last-known-good/obshchak.json');
	const existing = await readTextIfExists(dest);
	const existingM = existing ? metricsFromRaw(existing) : null;
	if (existingM && !isRicher(m, existingM)) return;
	await mkdir(join(root, 'storage', 'last-known-good'), { recursive: true });
	await writeFile(dest, raw.endsWith('\n') ? raw : `${raw}\n`, 'utf8');
}

function deployStamp() {
	const d = new Date();
	const p = (n, w = 2) => String(n).padStart(w, '0');
	return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}`;
}

async function phasePrePull() {
	const stamp = deployStamp();
	const dir = join(DEPLOY_BACKUPS, stamp);
	await mkdir(dir, { recursive: true });

	const obRaw = await readTextIfExists(rel(OBSHCHAK));
	if (obRaw) {
		await writeFile(join(dir, 'obshchak.json'), obRaw, 'utf8');
		await updateLastKnownGoodFrom(obRaw);
	}
	await copyIfExists(rel(BIRTHDAY), dir, 'birthday-dial-labels.json');
	await copyIfExists(rel(GAME_SCORES), dir, 'game-scores.json');

	await writeFile(MARKER, stamp, 'utf8');
	console.log(`OK: pre-pull backup at storage/deploy-backups/${stamp}`);

	// Ротация: оставить 30 последних
	try {
		const dirs = (await readdir(DEPLOY_BACKUPS)).filter((d) => /^\d{8}-\d{6}$/.test(d)).sort();
		for (const old of dirs.slice(0, Math.max(0, dirs.length - 30))) {
			const { rm } = await import('node:fs/promises');
			await rm(join(DEPLOY_BACKUPS, old), { recursive: true, force: true });
		}
	} catch {
		/* ignore */
	}
}

async function restoreObshchakIfNeeded() {
	const currentPath = rel(OBSHCHAK);
	const currentRaw = await readTextIfExists(currentPath);
	const currentM = currentRaw ? metricsFromRaw(currentRaw) : null;
	const best = await pickBestObshchak();

	if (!best) {
		console.log('OK: obshchak - no restore candidates');
		return { restored: false, currentM, bestM: null };
	}

	if (currentM && !isRicher(best.metrics, currentM)) {
		console.log(`OK: obshchak - current is not worse (${best.label})`);
		return { restored: false, currentM, bestM: best.metrics };
	}

	await mkdir(join(root, 'src', 'content'), { recursive: true });
	await writeFile(currentPath, best.raw.endsWith('\n') ? best.raw : `${best.raw}\n`, 'utf8');
	console.log(`OK: restored obshchak.json from ${best.label}`);
	console.log(formatMetricsPair('obshchak', currentM, best.metrics));
	await updateLastKnownGoodFrom(best.raw);
	return { restored: true, currentM, bestM: best.metrics };
}

async function restoreGenericIfSmaller(relPath, candidates) {
	const target = rel(relPath);
	const curBytes = await fileBytes(target);
	let bestPath = null;
	let bestBytes = curBytes;
	for (const c of candidates) {
		const b = await fileBytes(c);
		if (b > bestBytes) {
			bestBytes = b;
			bestPath = c;
		}
	}
	if (bestPath && bestBytes > curBytes) {
		const { dirname } = await import('node:path');
		await mkdir(dirname(target), { recursive: true });
		await copyFile(bestPath, target);
		console.log(`OK: restored ${relPath} (${curBytes} -> ${bestBytes} bytes)`);
		return true;
	}
	return false;
}

async function phasePostPull() {
	await restoreObshchakIfNeeded();

	let marker = '';
	try {
		marker = (await readFile(MARKER, 'utf8')).trim();
	} catch {
		/* no marker */
	}
	const backupDir = marker ? join(DEPLOY_BACKUPS, marker) : null;

	const genericCandidates = (name) => {
		const list = [];
		if (backupDir) list.push(join(backupDir, name));
		list.push(rel(`storage/last-known-good/${name}`));
		return list.filter((p) => existsSync(p));
	};

	await restoreGenericIfSmaller(BIRTHDAY, genericCandidates('birthday-dial-labels.json'));
	await restoreGenericIfSmaller(GAME_SCORES, genericCandidates('game-scores.json'));

	// birthday .bak restore (legacy)
	const bak = rel('storage/birthday-dial-labels.json.bak');
	if (existsSync(bak)) {
		try {
			const { spawnSync } = await import('node:child_process');
			spawnSync(process.execPath, ['scripts/restore-birthday-dial-from-bak.mjs'], {
				cwd: root,
				stdio: 'inherit',
			});
		} catch {
			/* optional */
		}
	}
}

async function phaseVerify() {
	const currentM = await metricsFromFile(rel(OBSHCHAK));
	const best = await pickBestObshchak();

	if (best?.metrics && best.metrics.expenseCount > 0 && currentM && currentM.expenseCount === 0) {
		console.error(
			`FATAL: obshchak.json потерял траты после деплоя (${best.label} had ${best.metrics.expenseCount}, now 0)`,
		);
		process.exit(1);
	}

	if (best?.metrics && !currentM?.isEmpty && isRicher(best.metrics, currentM)) {
		console.error(`FATAL: obshchak.json беднее бэкапа (${best.label})`);
		console.error(formatMetricsPair('verify', currentM, best.metrics));
		process.exit(1);
	}

	const { spawnSync } = await import('node:child_process');
	const r = spawnSync(process.execPath, ['scripts/verify-obshchak.mjs'], { cwd: root, stdio: 'inherit' });
	if (r.status !== 0) process.exit(r.status ?? 1);

	console.log('OK: verify phase passed');
}

const phase = parseArgs();
if (phase === 'pre-pull') await phasePrePull();
else if (phase === 'post-pull') await phasePostPull();
else await phaseVerify();
