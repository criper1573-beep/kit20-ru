/**
 * Восстановление src/content/*.md из снимков admin-change-log,
 * когда entries.jsonl утерян, но папка snapshots/ сохранилась.
 * Берёт последний *-after.md по mtime для каждого целевого файла.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const snapDir = path.join(root, 'storage', 'admin-change-log', 'snapshots');

function inferTargetPath(content) {
	const slug = content.match(/^slug:\s*([a-zA-Z0-9_-]+)\s*$/m);
	if (slug) return `src/content/students/${slug[1]}.md`;

	if (/^---[\s\S]*?\nlessons:/m.test(content) || /^lessons:/m.test(content.trimStart())) {
		return 'src/content/attendance.md';
	}

	if (/^title:\s*.+/m.test(content) && (/^semesters:/m.test(content) || /^photo:\s*/m.test(content))) {
		return 'src/content/home.md';
	}

	return null;
}

if (!fs.existsSync(snapDir)) {
	console.error('Нет каталога снимков:', snapDir);
	process.exit(1);
}

/** @type {Map<string, { path: string, mtimeMs: number }>} */
const latest = new Map();

for (const name of fs.readdirSync(snapDir)) {
	if (!name.endsWith('-after.md')) continue;
	const full = path.join(snapDir, name);
	let content = '';
	try {
		content = fs.readFileSync(full, 'utf8');
	} catch {
		continue;
	}
	const target = inferTargetPath(content);
	if (!target) {
		console.warn('Не удалось определить файл для', name);
		continue;
	}
	const mtimeMs = fs.statSync(full).mtimeMs;
	const prev = latest.get(target);
	if (!prev || mtimeMs >= prev.mtimeMs) {
		latest.set(target, { path: full, mtimeMs });
	}
}

let n = 0;
for (const [rel, { path: src }] of latest) {
	const dest = path.join(root, rel);
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(src, dest);
	console.log('OK', rel, '←', path.basename(src));
	n++;
}
console.log('Готово, восстановлено файлов:', n);
