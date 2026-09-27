#!/usr/bin/env node
/**
 * Сид src/content/etude-topics.json из снимка прод-этюдов.
 *
 *   node scripts/seed-etude-topics.mjs
 *
 * Индекс etudes[] у студента:
 *   0 → Предмет
 *   1 → Животное
 *   2 → Органичное молчание («3 стихии»)
 * Наблюдение за людьми и Пименов — пустые.
 * Пименов создаётся последним → слева в меню (newest-left).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const livePath = join(root, 'scripts', 'data', 'students-etudes-live.json');
const outPath = join(root, 'src', 'content', 'etude-topics.json');

const TOPIC_DEFS = [
	{ id: 'predmet', title: 'Предмет', createdAt: '2026-09-01T10:00:00.000Z', etudeIndex: 0 },
	{ id: 'zhivotnoe', title: 'Животное', createdAt: '2026-09-01T10:00:01.000Z', etudeIndex: 1 },
	{
		id: 'organichnoe-molchanie',
		title: 'Органичное молчание',
		createdAt: '2026-09-01T10:00:02.000Z',
		etudeIndex: 2,
	},
	{
		id: 'nablyudenie-za-lyudmi',
		title: 'Наблюдение за людьми',
		createdAt: '2026-09-01T10:00:03.000Z',
		etudeIndex: null,
	},
	{ id: 'pimenov', title: 'Пименов', createdAt: '2026-09-01T10:00:04.000Z', etudeIndex: null },
];

const live = JSON.parse(await readFile(livePath, 'utf8'));
if (!Array.isArray(live)) {
	console.error('students-etudes-live.json должен быть массивом');
	process.exit(1);
}

const topics = TOPIC_DEFS.map(({ id, title, createdAt }) => ({ id, title, createdAt }));
const etudes = [];

for (const topic of TOPIC_DEFS) {
	if (topic.etudeIndex === null) continue;
	for (const student of live) {
		const slug = student?.slug;
		const row = Array.isArray(student?.etudes) ? student.etudes[topic.etudeIndex] : null;
		if (!slug || !row?.title) continue;
		const comment = typeof row.teacherComment === 'string' ? row.teacherComment : '';
		etudes.push({
			id: `${topic.id}--${slug}`,
			topicId: topic.id,
			title: row.title,
			teacherComment: comment,
			participantSlugs: [slug],
		});
	}
}

const data = { topics, etudes };
await writeFile(outPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const byTopic = Object.fromEntries(topics.map((t) => [t.id, 0]));
for (const e of etudes) byTopic[e.topicId] = (byTopic[e.topicId] ?? 0) + 1;

console.error(`OK: wrote ${outPath}`);
console.error(`topics=${topics.length} etudes=${etudes.length}`);
for (const t of topics) {
	console.error(`  ${t.title}: ${byTopic[t.id] ?? 0}`);
}
