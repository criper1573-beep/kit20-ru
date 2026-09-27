#!/usr/bin/env node
/**
 * Проверка модели тем/этюдов и сида.
 *   node scripts/verify-etude-topics.mjs
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = join(root, 'src', 'content', 'etude-topics.json');
const livePath = join(root, 'scripts', 'data', 'students-etudes-live.json');

function fail(msg) {
	console.error(`FAIL: ${msg}`);
	process.exit(1);
}

function sortTopicsNewestLeft(topics) {
	return [...topics].sort((a, b) => {
		const tb = Date.parse(b.createdAt);
		const ta = Date.parse(a.createdAt);
		const nb = Number.isFinite(tb) ? tb : 0;
		const na = Number.isFinite(ta) ? ta : 0;
		if (nb !== na) return nb - na;
		return String(b.id).localeCompare(String(a.id), 'ru');
	});
}

const raw = JSON.parse(await readFile(dataPath, 'utf8'));
const live = JSON.parse(await readFile(livePath, 'utf8'));

if (!Array.isArray(raw.topics) || !Array.isArray(raw.etudes)) {
	fail('ожидаются topics[] и etudes[]');
}

const topicIds = new Set();
for (const t of raw.topics) {
	if (!t?.id || !t?.title || !t?.createdAt) fail(`тема без id/title/createdAt: ${JSON.stringify(t)}`);
	if (topicIds.has(t.id)) fail(`дубликат id темы: ${t.id}`);
	topicIds.add(t.id);
}

const etudeIds = new Set();
for (const e of raw.etudes) {
	if (!e?.id || !e?.topicId || !e?.title) fail(`этюд без id/topicId/title: ${JSON.stringify(e)}`);
	if (etudeIds.has(e.id)) fail(`дубликат id этюда: ${e.id}`);
	if (!topicIds.has(e.topicId)) fail(`этюд ${e.id} → неизвестная тема ${e.topicId}`);
	if (!Array.isArray(e.participantSlugs)) fail(`этюд ${e.id}: нет participantSlugs`);
	etudeIds.add(e.id);
}

const byTitle = Object.fromEntries(raw.topics.map((t) => [t.title, t]));
for (const title of ['Предмет', 'Животное', 'Органичное молчание', 'Наблюдение за людьми', 'Пименов']) {
	if (!byTitle[title]) fail(`нет темы «${title}»`);
}
if (raw.topics.length !== 5) fail(`ожидалось 5 тем, есть ${raw.topics.length}`);

const ordered = sortTopicsNewestLeft(raw.topics);
if (ordered[0]?.title !== 'Пименов') {
	fail(`слева должна быть «Пименов», сейчас «${ordered[0]?.title}»`);
}

const emptyTitles = ['Наблюдение за людьми', 'Пименов'];
for (const title of emptyTitles) {
	const id = byTitle[title].id;
	const n = raw.etudes.filter((e) => e.topicId === id).length;
	if (n !== 0) fail(`тема «${title}» должна быть пустой, этюдов: ${n}`);
}

const indexToTitle = ['Предмет', 'Животное', 'Органичное молчание'];
let expectedRows = 0;
for (const student of live) {
	const slug = student.slug;
	const etudes = Array.isArray(student.etudes) ? student.etudes : [];
	for (let i = 0; i < 3; i++) {
		const src = etudes[i];
		if (!src?.title) continue;
		expectedRows += 1;
		const topic = byTitle[indexToTitle[i]];
		const row = raw.etudes.find((e) => e.topicId === topic.id && e.participantSlugs.includes(slug));
		if (!row) fail(`нет строки ${indexToTitle[i]} / ${slug}`);
		if (row.title !== src.title) {
			fail(`${slug} [${i}]: title «${row.title}» ≠ «${src.title}»`);
		}
		const comment = typeof src.teacherComment === 'string' ? src.teacherComment : '';
		if ((row.teacherComment ?? '') !== comment) {
			fail(`${slug} [${i}]: comment mismatch`);
		}
		if (row.participantSlugs.length !== 1 || row.participantSlugs[0] !== slug) {
			fail(`${slug} [${i}]: ожидался один участник ${slug}`);
		}
		if (i === 2 && src.title === '3 стихии' && topic.title !== 'Органичное молчание') {
			fail('«3 стихии» должны быть в «Органичное молчание»');
		}
	}
}

if (raw.etudes.length !== expectedRows) {
	fail(`этюдов ${raw.etudes.length}, ожидалось ${expectedRows}`);
}

const threeStihii = raw.etudes.filter((e) => e.title === '3 стихии');
const silenceId = byTitle['Органичное молчание'].id;
if (threeStihii.some((e) => e.topicId !== silenceId)) {
	fail('есть «3 стихии» вне «Органичное молчание»');
}

console.error(`OK: etude-topics topics=${raw.topics.length} etudes=${raw.etudes.length}`);
console.error(`OK: newest-left = ${ordered.map((t) => t.title).join(' | ')}`);
