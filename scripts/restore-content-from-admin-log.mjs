/**
 * Восстанавливает файлы в src/content из последних снимков «после»
 * в storage/admin-change-log (журнал админки).
 * Запуск из корня проекта: node scripts/restore-content-from-admin-log.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const entriesPath = path.join(root, 'storage', 'admin-change-log', 'entries.jsonl');
const snapDir = path.join(root, 'storage', 'admin-change-log', 'snapshots');

let raw = '';
try {
	raw = fs.readFileSync(entriesPath, 'utf8');
} catch (e) {
	console.error('Нет файла журнала:', entriesPath);
	process.exit(1);
}

/** @type {Map<string, { targetPath: string, afterSnapshot: string }>} */
const lastByPath = new Map();
for (const line of raw.split('\n')) {
	const t = line.trim();
	if (!t) continue;
	try {
		const e = JSON.parse(t);
		if (e?.targetPath && e?.afterSnapshot) {
			lastByPath.set(e.targetPath, e);
		}
	} catch {
		// skip
	}
}

let n = 0;
for (const [rel, e] of lastByPath) {
	const afterPath = path.join(snapDir, e.afterSnapshot);
	const dest = path.join(root, rel);
	if (!fs.existsSync(afterPath)) {
		console.warn('Нет снимка, пропуск:', afterPath);
		continue;
	}
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(afterPath, dest);
	console.log('OK', rel);
	n++;
}
console.log('Готово, файлов:', n);
