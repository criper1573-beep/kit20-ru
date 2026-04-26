/**
 * Проверка: сумма личных балансов = касса; доли по трате = полная сумма;
 * 17 учеников. Запуск: node scripts/verify-obshchak.mjs
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const N = 17;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const studentsDir = join(root, 'src', 'content', 'students');
const md = (await readdir(studentsDir)).filter((f) => f.endsWith('.md'));
if (md.length !== N) {
	console.error(`Ожидается ${N} .md в students/, сейчас ${md.length}`);
	process.exit(1);
}

const obPath = join(root, 'src', 'content', 'obshchak.json');
const raw = await readFile(obPath, 'utf8');
const j = JSON.parse(raw);
const { watcherSlug, contributedKopeks = {}, expenses = [] } = j;

if (!watcherSlug) {
	console.error('Нет watcherSlug');
	process.exit(1);
}

// Порядок как в readStudentsSorted: сортировка по order внутри .md
async function readOrder(slug) {
	const t = await readFile(join(studentsDir, `${slug}.md`), 'utf8');
	const m = t.match(/^\s*order:\s*(\d+)/m);
	return m ? parseInt(m[1], 10) : 9999;
}
const slugs = md.map((f) => f.replace(/\.md$/, ''));
const withOrder = await Promise.all(
	slugs.map(async (slug) => ({ slug, order: await readOrder(slug) })),
);
const order17 = withOrder.sort((a, b) => a.order - b.order).map((x) => x.slug);

if (order17.length !== N) {
	console.error('order17', order17);
	process.exit(1);
}

function splitExpenseK(amountK) {
	const base = Math.floor(amountK / N);
	const rem = amountK - base * N;
	const m = new Map();
	for (let i = 0; i < N; i++) {
		m.set(order17[i], base + (i < rem ? 1 : 0));
	}
	return m;
}

let totalContrib = 0;
const contrib = {};
for (const slug of order17) {
	const v = contributedKopeks[slug] ?? 0;
	contrib[slug] = v;
	totalContrib += v;
}
let expSum = 0;
const share = Object.fromEntries(order17.map((s) => [s, 0]));
for (const e of expenses) {
	expSum += e.amountKopeks;
	const part = splitExpenseK(e.amountKopeks);
	for (const s of order17) {
		share[s] += part.get(s) ?? 0;
	}
}
const pot = totalContrib - expSum;
let sumBal = 0;
for (const s of order17) {
	sumBal += contrib[s] - share[s];
}
if (sumBal !== pot) {
	console.error('Несходится: sum(balances)=', sumBal, 'totalPot=', pot);
	process.exit(1);
}
if (order17[0] !== 'nastya') {
	console.warn('Примечание: первый по order — не nastya, ожидали визуал «смотрящий» = nastya — проверьте order в students.');
}
console.log('OK: баланс сходится, касса', pot, 'коп., трат', expenses.length);
process.exit(0);
