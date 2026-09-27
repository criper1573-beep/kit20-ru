import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	balanceKopeksBySlug,
	splitExpenseKopeksPerPerson,
	totalPotKopeks,
	totalShareKopeksBySlug,
} from './obshchakMath.ts';
import {
	KATYA_KUZINA_SLUG,
	OBSHCHAK_DELETED_CONTRIB_SLUGS,
	OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS,
	migrateObshchakData,
} from './obshchakRoster.mjs';

const thirteen = [...OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS];
const remainingNine = thirteen.filter((s) => !OBSHCHAK_DELETED_CONTRIB_SLUGS.includes(s));
const rosterWithKatya = [...remainingNine, KATYA_KUZINA_SLUG];

test('исторический снимок — 13 человек, без Кати, с ушедшими', () => {
	assert.equal(thirteen.length, 13);
	assert.equal(thirteen.includes(KATYA_KUZINA_SLUG), false);
	for (const slug of OBSHCHAK_DELETED_CONTRIB_SLUGS) {
		assert.equal(thirteen.includes(slug), true, slug);
	}
	assert.equal(remainingNine.length, 9);
});

test('split 1300 коп. на 13 — по 100, без остатка', () => {
	const part = splitExpenseKopeksPerPerson(1300, thirteen);
	assert.equal(part.size, 13);
	let sum = 0;
	for (const k of part.values()) {
		assert.equal(k, 100);
		sum += k;
	}
	assert.equal(sum, 1300);
	assert.equal(part.has(KATYA_KUZINA_SLUG), false);
});

test('остаток копеек — первым по сайтному order', () => {
	const part = splitExpenseKopeksPerPerson(1301, thirteen);
	assert.equal(part.get('nastya'), 101);
	assert.equal(part.get('marusya'), 100);
	let sum = 0;
	for (const k of part.values()) sum += k;
	assert.equal(sum, 1301);
});

test('исторические траты: Катя не в доле, баланс 0 при взносе 0', () => {
	const expenses = [
		{ amountKopeks: 1300, participantSlugs: thirteen },
		{ amountKopeks: 650, participantSlugs: thirteen },
	];
	const share = totalShareKopeksBySlug(rosterWithKatya, expenses);
	assert.equal(share.get(KATYA_KUZINA_SLUG), 0);
	assert.equal(share.get('nastya'), 150);
	assert.equal(share.get('marusya'), 150);

	const contributed: Record<string, number> = { [KATYA_KUZINA_SLUG]: 0 };
	const bal = balanceKopeksBySlug(rosterWithKatya, contributed, expenses);
	assert.equal(bal.get(KATYA_KUZINA_SLUG), 0);
});

test('старый 13-way не перекладывает долю ушедших на оставшихся', () => {
	const expenses = [{ amountKopeks: 1300, participantSlugs: thirteen }];
	const share13 = totalShareKopeksBySlug(rosterWithKatya, expenses);
	const share9 = totalShareKopeksBySlug(
		rosterWithKatya,
		[{ amountKopeks: 1300, participantSlugs: remainingNine }],
	);
	assert.equal(share13.get('nastya'), 100);
	assert.equal(share9.get('nastya'), Math.floor(1300 / 9) + 1);
	assert.notEqual(share13.get('nastya'), share9.get('nastya'));
});

test('новая трата со снимком, включая Катю — ей начисляется доля', () => {
	const expenses = [
		{ amountKopeks: 1300, participantSlugs: thirteen },
		{ amountKopeks: 1000, participantSlugs: rosterWithKatya },
	];
	const share = totalShareKopeksBySlug(rosterWithKatya, expenses);
	assert.equal(share.get(KATYA_KUZINA_SLUG), 100);
	assert.equal(share.get('nastya'), 100 + 100);
});

test('без participantSlugs — fallback на весь текущий список (Катя платит)', () => {
	const share = totalShareKopeksBySlug(rosterWithKatya, [{ amountKopeks: 1000 }]);
	assert.equal(share.get(KATYA_KUZINA_SLUG), 100);
});

test('касса: live + archived − траты, деньги ушедших не пропадают', () => {
	const live = { nastya: 500, [KATYA_KUZINA_SLUG]: 0 };
	const archived = {
		seryozha: 10_000,
		anya: 10_000,
		galya: 10_000,
		'yulya-1': 10_000,
	};
	const expenses = [{ amountKopeks: 200 }];
	assert.equal(totalPotKopeks(live, expenses, archived), 40_300);
	assert.equal(totalPotKopeks({ ...live, ...archived }, expenses, {}), 40_300);
	assert.notEqual(totalPotKopeks(live, expenses, {}), 40_300);
});

test('migrate: ушедшие → archived, katya=0, снимок 13, касса та же', () => {
	const before = {
		watcherSlug: 'nastya',
		contributedKopeks: {
			nastya: 100,
			seryozha: 50,
			anya: 50,
			galya: 50,
			'yulya-1': 50,
		},
		expenses: [{ id: 'e1', label: 'чай', amountKopeks: 900 }],
	};
	const potBefore = totalPotKopeks(before.contributedKopeks, before.expenses, {});
	const raw = migrateObshchakData(before);
	const contrib = raw.contributedKopeks as Record<string, number>;
	const archived = raw.archivedContributedKopeks as Record<string, number>;
	assert.equal(contrib.seryozha, undefined);
	assert.equal(contrib.anya, undefined);
	assert.equal(contrib.galya, undefined);
	assert.equal(contrib['yulya-1'], undefined);
	assert.equal(contrib[KATYA_KUZINA_SLUG], 0);
	assert.equal(contrib.nastya, 100);
	assert.equal(archived.seryozha, 50);
	assert.equal(archived.anya, 50);
	assert.equal(archived.galya, 50);
	assert.equal(archived['yulya-1'], 50);
	const exp = (raw.expenses as { participantSlugs: string[] }[])[0];
	assert.deepEqual(exp.participantSlugs, thirteen);
	assert.equal(totalPotKopeks(contrib, before.expenses, archived), potBefore);

	const bal = balanceKopeksBySlug(
		rosterWithKatya,
		contrib,
		raw.expenses as { amountKopeks: number; participantSlugs?: string[] }[],
	);
	assert.equal(bal.get(KATYA_KUZINA_SLUG), 0);
});
