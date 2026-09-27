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
	OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS,
	migrateObshchakData,
} from './obshchakRoster.mjs';

const nine = [...OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS];
const rosterWithKatya = [...nine, KATYA_KUZINA_SLUG];

test('split 900 коп. на 9 — по 100, без остатка', () => {
	const part = splitExpenseKopeksPerPerson(900, nine);
	assert.equal(part.size, 9);
	let sum = 0;
	for (const k of part.values()) {
		assert.equal(k, 100);
		sum += k;
	}
	assert.equal(sum, 900);
	assert.equal(part.has(KATYA_KUZINA_SLUG), false);
});

test('остаток копеек — первым по порядку (сайтный order)', () => {
	const part = splitExpenseKopeksPerPerson(901, nine);
	assert.equal(part.get('nastya'), 101);
	assert.equal(part.get('marusya'), 100);
	let sum = 0;
	for (const k of part.values()) sum += k;
	assert.equal(sum, 901);
});

test('исторические траты: Катя не в доле, баланс 0 при взносе 0', () => {
	const expenses = [
		{ amountKopeks: 900, participantSlugs: nine },
		{ amountKopeks: 450, participantSlugs: nine },
	];
	const share = totalShareKopeksBySlug(rosterWithKatya, expenses);
	assert.equal(share.get(KATYA_KUZINA_SLUG), 0);
	assert.equal(share.get('nastya'), 150);
	assert.equal(share.get('marusya'), 150);

	const contributed: Record<string, number> = { [KATYA_KUZINA_SLUG]: 0 };
	const bal = balanceKopeksBySlug(rosterWithKatya, contributed, expenses);
	assert.equal(bal.get(KATYA_KUZINA_SLUG), 0);
});

test('новая трата со снимком, включая Катю — ей начисляется доля', () => {
	const expenses = [
		{ amountKopeks: 900, participantSlugs: nine },
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

test('касса: взносы ушедших не считаются', () => {
	const contributed = {
		nastya: 500,
		seryozha: 10_000,
		anya: 10_000,
		galya: 10_000,
		'yulya-1': 10_000,
		[KATYA_KUZINA_SLUG]: 0,
	};
	const pot = totalPotKopeks(contributed, [{ amountKopeks: 200 }]);
	assert.equal(pot, 300);
});

test('migrate: выкидывает ушедших, katya=0, снимок 9 на старых тратах', () => {
	const raw = migrateObshchakData({
		watcherSlug: 'nastya',
		contributedKopeks: {
			nastya: 100,
			seryozha: 50,
			anya: 50,
			galya: 50,
			'yulya-1': 50,
		},
		expenses: [{ id: 'e1', label: 'чай', amountKopeks: 900 }],
	});
	const contrib = raw.contributedKopeks as Record<string, number>;
	assert.equal(contrib.seryozha, undefined);
	assert.equal(contrib.anya, undefined);
	assert.equal(contrib.galya, undefined);
	assert.equal(contrib['yulya-1'], undefined);
	assert.equal(contrib[KATYA_KUZINA_SLUG], 0);
	assert.equal(contrib.nastya, 100);
	const exp = (raw.expenses as { participantSlugs: string[] }[])[0];
	assert.deepEqual(exp.participantSlugs, nine);

	const bal = balanceKopeksBySlug(rosterWithKatya, contrib, raw.expenses as { amountKopeks: number; participantSlugs?: string[] }[]);
	assert.equal(bal.get(KATYA_KUZINA_SLUG), 0);
});
