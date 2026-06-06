#!/usr/bin/env node
/**
 * Восстановить только etudes в src/content/students/*.md из git stash,
 * не трогая фото, ФИО, даты рождения и прочие поля текущих карточек.
 *
 *   node scripts/restore-student-etudes-from-stash.mjs
 *   node scripts/restore-student-etudes-from-stash.mjs --stash=stash@{1}
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'yaml';

const root = process.cwd();
const studentsDir = join(root, 'src', 'content', 'students');

const stashArg = process.argv.find((a) => a.startsWith('--stash='))?.split('=')[1] ?? 'stash@{1}';

function parseMarkdownFile(raw) {
	const text = raw.replace(/^\uFEFF/, '');
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!m) return { data: {}, body: text };
	return { data: YAML.parse(m[1]) ?? {}, body: m[2] ?? '' };
}

function stringifyMarkdownFile(data, body) {
	const fm = YAML.stringify(data, { lineWidth: 120 }).replace(/\n$/, '');
	const b = body.trimEnd();
	return `---\n${fm}\n---\n${b ? `${b}\n` : ''}`;
}

function gitShow(ref, relPath) {
	const r = spawnSync('git', ['show', `${ref}:${relPath}`], { cwd: root, encoding: 'utf8' });
	if (r.status !== 0) return null;
	return r.stdout;
}

function normalizeEtudes(raw) {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((e) => e && typeof e.title === 'string' && e.title.trim())
		.map((e) => {
			const o = {
				title: e.title.trim(),
				passed: Boolean(e.passed),
			};
			if (e.date && String(e.date).trim()) o.date = String(e.date).trim();
			if (e.teacherComment && String(e.teacherComment).trim()) {
				o.teacherComment = String(e.teacherComment).trim();
			}
			return o;
		});
}

function countEtudes(etudes) {
	return normalizeEtudes(etudes).length;
}

const names = (await readdir(studentsDir)).filter((n) => n.endsWith('.md'));
let updated = 0;
let skipped = 0;

for (const name of names) {
	const rel = `src/content/students/${name}`;
	const curPath = join(studentsDir, name);
	const curRaw = await readFile(curPath, 'utf8');
	const cur = parseMarkdownFile(curRaw);

	const bakRaw = gitShow(stashArg, rel);
	if (!bakRaw) {
		console.error(`skip ${name}: нет в ${stashArg}`);
		skipped++;
		continue;
	}
	const bak = parseMarkdownFile(bakRaw);
	const bakEtudes = normalizeEtudes(bak.data?.etudes);
	const curEtudes = normalizeEtudes(cur.data?.etudes);

	if (bakEtudes.length === 0) {
		console.error(`skip ${name}: в ${stashArg} нет этюдов`);
		skipped++;
		continue;
	}
	if (curEtudes.length >= bakEtudes.length && curEtudes.length > 0) {
		console.error(`skip ${name}: текущих этюдов уже ${curEtudes.length}`);
		skipped++;
		continue;
	}

	const merged = {
		...cur.data,
		etudes: bakEtudes,
	};
	const out = stringifyMarkdownFile(merged, cur.body);
	await writeFile(curPath, out, 'utf8');
	console.error(`OK ${name}: ${curEtudes.length} -> ${bakEtudes.length} этюдов`);
	updated++;
}

const total = names.reduce(async (accP, name) => {
	const acc = await accP;
	const raw = await readFile(join(studentsDir, name), 'utf8');
	return acc + countEtudes(parseMarkdownFile(raw).data?.etudes);
}, Promise.resolve(0));

console.error(`Готово: обновлено ${updated}, пропущено ${skipped}, всего этюдов на диске: ${await total}`);
