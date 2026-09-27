/**
 * Состав общака после ухода учеников и прихода Кати Кузиной (`katya`).
 * Исторические траты (без снимка) делим на девятерых — без Кати.
 */

/** Взносы этих slug не входят в кассу (карточки удалены). */
export const OBSHCHAK_DELETED_CONTRIB_SLUGS = Object.freeze(['anya', 'galya', 'seryozha', 'yulya-1']);

/** Катя Кузина — на старых тратах не участвует, взнос 0. */
export const KATYA_KUZINA_SLUG = 'katya';

/**
 * Активный состав на момент уже записанных трат, без `katya`.
 * Порядок = `order` с карточек: Настя, Катя М., Ира, Газик, Егор, Коля, Вика, Наташа, Маруся.
 */
export const OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS = Object.freeze([
	'nastya',
	'katya-2',
	'ira',
	'gazik',
	'egor',
	'kolya',
	'vika',
	'natasha',
	'marusya',
]);

/** @param {string} slug */
export function isDeletedObshchakContributor(slug) {
	return OBSHCHAK_DELETED_CONTRIB_SLUGS.includes(slug);
}

/**
 * @param {{ participantSlugs?: string[] } | null | undefined} expense
 * @param {string[]} fallbackSlugs
 * @returns {string[]}
 */
export function participantsForExpense(expense, fallbackSlugs) {
	const p = expense?.participantSlugs;
	if (Array.isArray(p) && p.length > 0) return p;
	return fallbackSlugs;
}

/**
 * Убрать взносы ушедших, поставить `katya: 0`, проставить снимок 9 участников
 * на тратах без `participantSlugs`.
 *
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown>}
 */
export function migrateObshchakData(data) {
	const src = data && typeof data === 'object' ? data : {};
	const contributedIn =
		src.contributedKopeks && typeof src.contributedKopeks === 'object' && !Array.isArray(src.contributedKopeks)
			? src.contributedKopeks
			: {};
	/** @type {Record<string, number>} */
	const contributed = {};
	for (const [slug, value] of Object.entries(contributedIn)) {
		if (isDeletedObshchakContributor(slug)) continue;
		contributed[slug] = value;
	}
	if (!(KATYA_KUZINA_SLUG in contributed)) {
		contributed[KATYA_KUZINA_SLUG] = 0;
	}

	const expensesIn = Array.isArray(src.expenses) ? src.expenses : [];
	const expenses = expensesIn.map((e) => {
		if (!e || typeof e !== 'object') return e;
		if (Array.isArray(e.participantSlugs) && e.participantSlugs.length > 0) return e;
		return { ...e, participantSlugs: [...OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS] };
	});

	return { ...src, contributedKopeks: contributed, expenses };
}
