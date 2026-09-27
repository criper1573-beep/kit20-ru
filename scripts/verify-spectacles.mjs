#!/usr/bin/env node
/**
 * Проверка модели спектаклей и сида.
 *   node scripts/verify-spectacles.mjs
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'src', 'content', 'spectacles.json');
const homePath = join(root, 'src', 'content', 'home.md');

function fail(msg) {
	console.error(`FAIL: ${msg}`);
	process.exit(1);
}

function sortSpectacles(items) {
	return [...items].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return String(a.id).localeCompare(String(b.id), 'ru');
	});
}

const raw = JSON.parse(await readFile(dataPath, 'utf8'));
if (!Array.isArray(raw.spectacles)) fail('ожидается spectacles[]');

const ids = new Set();
for (const s of raw.spectacles) {
	if (!s?.id) fail(`спектакль без id: ${JSON.stringify(s)}`);
	if (typeof s.title !== 'string') fail(`${s.id}: title должен быть строкой`);
	if (typeof s.heroPhoto !== 'string') fail(`${s.id}: heroPhoto должен быть строкой`);
	if (typeof s.directorName !== 'string') fail(`${s.id}: directorName должен быть строкой`);
	if (typeof s.directorRegalia !== 'string') fail(`${s.id}: directorRegalia должен быть строкой`);
	if (typeof s.directorPhoto !== 'string') fail(`${s.id}: directorPhoto должен быть строкой`);
	if (!Array.isArray(s.gallery)) fail(`${s.id}: gallery должен быть массивом`);
	if (typeof s.order !== 'number') fail(`${s.id}: order должен быть числом`);
	if (ids.has(s.id)) fail(`дубликат id: ${s.id}`);
	ids.add(s.id);
}

if (raw.spectacles.length < 1) fail('нужен хотя бы один сид-спектакль');

const seed = raw.spectacles.find((s) => s.title === 'Спектакль-заглушка');
if (!seed) fail('нет сида «Спектакль-заглушка»');
if (!seed.directorName.includes('заглушка')) fail('сид режиссёра должен быть помечен как заглушка');
if (!seed.heroPhoto.startsWith('/placeholders/') && !seed.heroPhoto.startsWith('/uploads/')) {
	fail('сид heroPhoto должен быть /placeholders/... или /uploads/...');
}

const sortedSample = sortSpectacles([
	{ id: 'b', order: 2 },
	{ id: 'a', order: 2 },
	{ id: 'c', order: 0 },
]);
if (sortedSample.map((s) => s.id).join(',') !== 'c,a,b') {
	fail(`sortSpectacles: ожидалось c,a,b, получилось ${sortedSample.map((s) => s.id).join(',')}`);
}

const placeholderFiles = [
	join(root, 'public', 'placeholders', 'spectacle-hero.svg'),
	join(root, 'public', 'placeholders', 'spectacle-director.svg'),
	join(root, 'public', 'placeholders', 'spectacle-gallery-1.svg'),
];
for (const p of placeholderFiles) {
	try {
		await readFile(p);
	} catch {
		fail(`нет файла-заглушки: ${p}`);
	}
}

const ordered = sortSpectacles(raw.spectacles);

const home = await readFile(homePath, 'utf8');
if (/официальная страница группы/i.test(home)) {
	fail('home.md всё ещё содержит «Официальная страница группы…»');
}

console.error(`OK: spectacles count=${raw.spectacles.length} first="${ordered[0]?.title}"`);
