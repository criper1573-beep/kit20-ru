/** Число участников общака (группа КИТ20). */
export const OBSHCHAK_N = 17;

/**
 * Раскидать сумму траты в копейках поровну на N человек; остаток (0..N-1 коп.)
 * получают первые по списку `studentSlugsOrdered` (порядок `order` с сайта).
 */
export function splitExpenseKopeksPerPerson(
	amountKopeks: number,
	studentSlugsOrdered: string[],
): Map<string, number> {
	if (studentSlugsOrdered.length !== OBSHCHAK_N) {
		throw new Error(`obshchak: ожидается ${OBSHCHAK_N} slug'ов, получено ${studentSlugsOrdered.length}`);
	}
	if (!Number.isInteger(amountKopeks) || amountKopeks < 0) {
		throw new Error('obshchak: amountKopeks не целое >= 0');
	}
	const base = Math.floor(amountKopeks / OBSHCHAK_N);
	const rem = amountKopeks - base * OBSHCHAK_N;
	const out = new Map<string, number>();
	for (let i = 0; i < studentSlugsOrdered.length; i++) {
		const slug = studentSlugsOrdered[i]!;
		out.set(slug, base + (i < rem ? 1 : 0));
	}
	return out;
}

/** Сколько с человека по всем тратам (коп.) */
export function totalShareKopeksBySlug(
	studentSlugsOrdered: string[],
	expenses: { amountKopeks: number }[],
): Map<string, number> {
	const total = new Map<string, number>();
	for (const slug of studentSlugsOrdered) {
		total.set(slug, 0);
	}
	for (const e of expenses) {
		const part = splitExpenseKopeksPerPerson(e.amountKopeks, studentSlugsOrdered);
		for (const slug of studentSlugsOrdered) {
			total.set(slug, (total.get(slug) ?? 0) + (part.get(slug) ?? 0));
		}
	}
	return total;
}

/** Взносы (коп.) по slug, только известные ключи. */
export function contributedKopeksTotal(contributed: Record<string, number>): number {
	return Object.values(contributed).reduce((a, b) => a + b, 0);
}

export function expensesTotalKopeks(expenses: { amountKopeks: number }[]): number {
	return expenses.reduce((a, e) => a + e.amountKopeks, 0);
}

/** Баланс: внёс − доля в тратах (копейки). */
export function balanceKopeksBySlug(
	studentSlugsOrdered: string[],
	contributed: Record<string, number>,
	expenses: { amountKopeks: number }[],
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

/** Сумма в общей кассе: все взносы − все траты (коп.) */
export function totalPotKopeks(
	contributed: Record<string, number>,
	expenses: { amountKopeks: number }[],
): number {
	return contributedKopeksTotal(contributed) - expensesTotalKopeks(expenses);
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
