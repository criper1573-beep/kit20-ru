/**
 * Сходимость общака. Запуск: node scripts/verify-obshchak.mjs
 * Касса = live + archived − траты. Исторические траты — на исходных 13 (без Кати).
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	KATYA_KUZINA_SLUG,
	isDeletedObshchakContributor,
	migrateObshchakData,
	participantsForExpense,
} from '../src/lib/obshchakRoster.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const studentsDir = join(root, 'src', 'content', 'students');
const md = (await readdir(studentsDir)).filter((f) => f.endsWith('.md'));
if (md.length < 1) {
	console.error('Нет учеников в students/');
	process.exit(1);
}

const obPath = join(root, 'src', 'content', 'obshchak.json');
let raw;
try {
	raw = await readFile(obPath, 'utf8');
} catch (e) {
	if (e && e.code === 'ENOENT') {
		console.log('OK: нет runtime obshchak.json (шаблон), пропускаем сходимость');
		process.exit(0);
	}
	throw e;
}
const j = migrateObshchakData(JSON.parse(raw));
const { watcherSlug, contributedKopeks = {}, archivedContributedKopeks = {}, expenses = [] } = j;

if (!watcherSlug) {
	console.error('Нет watcherSlug');
	process.exit(1);
}

async function readOrder(slug) {
	try {
		const t = await readFile(join(studentsDir, `${slug}.md`), 'utf8');
		const m = t.match(/^\s*order:\s*(\d+)/m);
		return m ? parseInt(m[1], 10) : 9999;
	} catch {
		return 9999;
	}
}
const slugs = md.map((f) => f.replace(/\.md$/, '')).filter((slug) => !isDeletedObshchakContributor(slug));
const withOrder = await Promise.all(
	slugs.map(async (slug) => ({ slug, order: await readOrder(slug) })),
);
const orderActive = withOrder.sort((a, b) => a.order - b.order).map((x) => x.slug);
if (!orderActive.includes(KATYA_KUZINA_SLUG)) {
	orderActive.push(KATYA_KUZINA_SLUG);
}

function splitExpenseK(amountK, participants) {
	const n = participants.length;
	if (n < 1) {
		throw new Error('нет участников траты');
	}
	const base = Math.floor(amountK / n);
	const rem = amountK - base * n;
	const m = new Map();
	for (let i = 0; i < n; i++) {
		m.set(participants[i], base + (i < rem ? 1 : 0));
	}
	return m;
}

function sumRecord(rec) {
	return Object.values(rec).reduce((a, b) => a + (Number(b) || 0), 0);
}

const liveTotal = sumRecord(contributedKopeks);
const archivedTotal = sumRecord(archivedContributedKopeks);
let expSum = 0;
let shareSum = 0;
const share = Object.fromEntries(orderActive.map((s) => [s, 0]));
for (const e of expenses) {
	expSum += e.amountKopeks;
	const parts = participantsForExpense(e, orderActive);
	const part = splitExpenseK(e.amountKopeks, parts);
	let partSum = 0;
	for (const [s, k] of part) {
		share[s] = (share[s] ?? 0) + k;
		partSum += k;
		shareSum += k;
	}
	if (partSum !== e.amountKopeks) {
		console.error('доля траты не сходится', e.id, partSum, e.amountKopeks);
		process.exit(1);
	}
}
if (shareSum !== expSum) {
	console.error('сумма долей', shareSum, '≠ траты', expSum);
	process.exit(1);
}

const pot = liveTotal + archivedTotal - expSum;
const katyaBal = (contributedKopeks[KATYA_KUZINA_SLUG] ?? 0) - (share[KATYA_KUZINA_SLUG] ?? 0);
const historicalOnly = expenses.every((e) => {
	const p = e.participantSlugs;
	return Array.isArray(p) && p.length > 0 && !p.includes(KATYA_KUZINA_SLUG);
});
if (historicalOnly && katyaBal !== 0) {
	console.error('Катя Кузина должна иметь баланс 0 на исторических тратах, сейчас', katyaBal);
	process.exit(1);
}

if (orderActive[0] !== 'nastya') {
	console.warn('Примечание: первый по order — не nastya, ожидали визуал «смотрящий» = nastya — проверьте order в students.');
}
console.log(
	'OK: касса',
	pot,
	'коп. (live',
	liveTotal,
	'+ archived',
	archivedTotal,
	'− траты',
	expSum,
	'), трат',
	expenses.length,
	'katya',
	katyaBal,
);
process.exit(0);
