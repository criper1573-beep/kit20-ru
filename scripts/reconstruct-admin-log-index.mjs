/**
 * Восстановить storage/admin-change-log/entries.jsonl из имён файлов snapshots/.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const logRoot = path.join(root, 'storage', 'admin-change-log');
const snapDir = path.join(logRoot, 'snapshots');
const indexFile = path.join(logRoot, 'entries.jsonl');

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

function entityFor(targetPath) {
	if (targetPath === 'src/content/home.md') return 'home';
	if (targetPath === 'src/content/attendance.md') return 'attendance';
	if (targetPath.startsWith('src/content/students/')) return 'student';
	return 'student';
}

/** @type {Array<{ id: string, createdAt: string, entity: string, kind: string, slug?: string, targetPath: string, beforeSnapshot: string, afterSnapshot: string }>} */
const entries = [];

for (const name of fs.readdirSync(snapDir)) {
	if (!name.endsWith('-after.md')) continue;
	const id = name.slice(0, -'-after.md'.length);
	const before = `${id}-before.md`;
	const after = name;
	if (!fs.existsSync(path.join(snapDir, before))) continue;

	let content = '';
	try {
		content = fs.readFileSync(path.join(snapDir, after), 'utf8');
	} catch {
		continue;
	}
	const targetPath = inferTargetPath(content);
	if (!targetPath) continue;

	const stat = fs.statSync(path.join(snapDir, after));
	const slugMatch = targetPath.match(/students\/([^.]+)\.md$/);
	entries.push({
		id,
		createdAt: stat.mtime.toISOString(),
		entity: entityFor(targetPath),
		kind: 'update',
		slug: slugMatch?.[1],
		targetPath,
		beforeSnapshot: before,
		afterSnapshot: after,
	});
}

entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
fs.mkdirSync(logRoot, { recursive: true });
fs.writeFileSync(indexFile, entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length ? '\n' : ''), 'utf8');
console.log('entries.jsonl восстановлен, записей:', entries.length);
