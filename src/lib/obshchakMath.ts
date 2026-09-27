import { participantsForExpense } from './obshchakRoster.mjs';

export type ObshchakExpenseShare = {
	amountKopeks: number;
	participantSlugs?: string[];
};

/**
 * Раскидать сумму траты в копейках поровну на `participantSlugsOrdered`; остаток (0..N-1 коп.)
 * получают первые по списку (порядок `order` с сайта в снимке).
 */
export function splitExpenseKopeksPerPerson(
	amountKopeks: number,
	participantSlugsOrdered: string[],
): Map<string, number> {
	const n = participantSlugsOrdered.length;
	if (n < 1) {
		throw new Error('obshchak: нужен хотя бы один участник');
	}
	if (!Number.isInteger(amountKopeks) || amountKopeks < 0) {
		throw new Error('obshchak: amountKopeks не целое >= 0');
	}
	const base = Math.floor(amountKopeks / n);
	const rem = amountKopeks - base * n;
	const out = new Map<string, number>();
	for (let i = 0; i < participantSlugsOrdered.length; i++) {
		const slug = participantSlugsOrdered[i]!;
		out.set(slug, base + (i < rem ? 1 : 0));
	}
	return out;
}

/** Сколько с человека по всем тратам (коп.). Трата со снимком — только на этих участников. */
export function totalShareKopeksBySlug(
	studentSlugsOrdered: string[],
	expenses: ObshchakExpenseShare[],
): Map<string, number> {
	const total = new Map<string, number>();
	for (const slug of studentSlugsOrdered) {
		total.set(slug, 0);
	}
	for (const e of expenses) {
		const parts = participantsForExpense(e, studentSlugsOrdered);
		const part = splitExpenseKopeksPerPerson(e.amountKopeks, parts);
		for (const [slug, kopeks] of part) {
			total.set(slug, (total.get(slug) ?? 0) + kopeks);
		}
	}
	return total;
}

/** Сумма взносов (коп.) по записи slug→коп. */
export function contributedKopeksTotal(contributed: Record<string, number> | undefined): number {
	if (!contributed) return 0;
	return Object.values(contributed).reduce((a, b) => a + b, 0);
}

export function expensesTotalKopeks(expenses: { amountKopeks: number }[]): number {
	return expenses.reduce((a, e) => a + e.amountKopeks, 0);
}

/** Баланс: внёс − доля в тратах (копейки). */
export function balanceKopeksBySlug(
	studentSlugsOrdered: string[],
	contributed: Record<string, number>,
	expenses: ObshchakExpenseShare[],
): Map<string, number> {
	const share = totalShareKopeksBySlug(studentSlugsOrdered, expenses);
	const out = new Map<string, number>();
	for (const slug of studentSlugsOrdered) {
		const c = contributed[slug] ?? 0;
		const s = share.get(slug) ?? 0;
		out.set(slug, c - s);
	}
	return out;
}

/** Касса: живые взносы + архив ушедших − траты (коп.). */
export function totalPotKopeks(
	contributed: Record<string, number>,
	expenses: { amountKopeks: number }[],
	archived: Record<string, number> = {},
): number {
	return contributedKopeksTotal(contributed) + contributedKopeksTotal(archived) - expensesTotalKopeks(expenses);
}

export function formatRubKopeks(kopeks: number): string {
	const rub = kopeks / 100;
	const sign = rub < 0 ? '−' : '';
	const v = Math.abs(rub);
	const s = Number.isInteger(v) ? String(v) : v.toFixed(2);
	return `${sign}${s}\u00a0₽`;
}

export function parseRubInputToKopeks(input: string): number | null {
	const t = input.trim().replace(/\s/g, '').replace(',', '.');
	if (t === '') return 0;
	const n = parseFloat(t);
	if (!Number.isFinite(n) || n < 0) return null;
	return Math.round(n * 100);
}
