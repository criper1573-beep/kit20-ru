/**
 * Оценка «богатства» obshchak.json — чтобы не затереть живые данные пустым шаблоном.
 */
import { readFile } from 'node:fs/promises';

/** @typedef {{ expenseCount: number; expenseKopeks: number; contribKopeks: number; potKopeks: number; score: number; isEmpty: boolean }} ObshchakMetrics */

/**
 * @param {unknown} data
 * @returns {ObshchakMetrics}
 */
export function metricsFromObshchak(data) {
	const contributed = data && typeof data === 'object' && data.contributedKopeks ? data.contributedKopeks : {};
	const expenses = data && typeof data === 'object' && Array.isArray(data.expenses) ? data.expenses : [];
	const expenseCount = expenses.length;
	const expenseKopeks = expenses.reduce((a, e) => a + (Number(e?.amountKopeks) || 0), 0);
	const contribKopeks = Object.values(contributed).reduce((a, v) => a + (Number(v) || 0), 0);
	const potKopeks = contribKopeks - expenseKopeks;
	const isEmpty = expenseCount === 0 && contribKopeks === 0;
	// Траты важнее всего: 30 трат >> пустой файл с большими взносами по ошибке
	const score = expenseCount * 1_000_000_000_000 + expenseKopeks * 1_000_000 + contribKopeks;
	return { expenseCount, expenseKopeks, contribKopeks, potKopeks, score, isEmpty };
}

/**
 * @param {string} raw
 * @returns {ObshchakMetrics | null}
 */
export function metricsFromRaw(raw) {
	try {
		return metricsFromObshchak(JSON.parse(raw));
	} catch {
		return null;
	}
}

/**
 * @param {string} filePath
 * @returns {Promise<ObshchakMetrics | null>}
 */
export async function metricsFromFile(filePath) {
	try {
		const raw = await readFile(filePath, 'utf8');
		return metricsFromRaw(raw);
	} catch {
		return null;
	}
}

/**
 * @param {ObshchakMetrics | null} a
 * @param {ObshchakMetrics | null} b
 */
export function isRicher(a, b) {
	if (!a) return false;
	if (!b) return true;
	return a.score > b.score;
}

/**
 * @param {ObshchakMetrics | null} a
 * @param {ObshchakMetrics | null} b
 */
export function formatMetricsPair(label, a, b) {
	const fmt = (m) =>
		m
			? `трат=${m.expenseCount}, расход=${m.expenseKopeks} коп., взносы=${m.contribKopeks} коп., касса=${m.potKopeks} коп.`
			: 'нет файла';
	return `${label}: было ${fmt(a)} -> стало ${fmt(b)}`;
}
