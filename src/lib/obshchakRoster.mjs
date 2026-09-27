/**
 * Состав общака после ухода учеников и прихода Кати Кузиной (`katya`).
 * Исторические траты делим на исходных 13 (включая ушедших), без Кати.
 * Деньги ушедших живут в `archivedContributedKopeks` и входят в кассу.
 */

/** Живые взносы этих slug не показываем; суммы переносятся в archived. */
export const OBSHCHAK_DELETED_CONTRIB_SLUGS = Object.freeze(['anya', 'galya', 'seryozha', 'yulya-1']);

/** Катя Кузина — на старых тратах не участвует, взнос 0. */
export const KATYA_KUZINA_SLUG = 'katya';

/**
 * Кто был в группе, когда писали уже существующие траты (без `katya`).
 * Порядок = `order` с карточек, при равенстве — slug.
 */
export const OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS = Object.freeze([
	'nastya',
	'katya-2',
	'ira',
	'galya',
	'gazik',
	'egor',
	'seryozha',
	'kolya',
	'vika',
	'yulya-1',
	'anya',
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
 * @param {unknown} rec
 * @returns {Record<string, number>}
 */
function asKopeksRecord(rec) {
	if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return {};
	/** @type {Record<string, number>} */
	const out = {};
	for (const [slug, value] of Object.entries(rec)) {
		const n = Number(value);
		if (Number.isFinite(n)) out[slug] = n;
	}
	return out;
}

/**
 * Живые взносы без ушедших; их деньги → archived; katya=0;
 * на тратах без снимка — исходные 13 участников.
 *
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown>}
 */
export function migrateObshchakData(data) {
	const src = data && typeof data === 'object' ? data : {};
	const contributedIn = asKopeksRecord(src.contributedKopeks);
	const archived = asKopeksRecord(src.archivedContributedKopeks);

	/** @type {Record<string, number>} */
	const contributed = {};
	for (const [slug, value] of Object.entries(contributedIn)) {
		if (isDeletedObshchakContributor(slug)) {
			if (!(slug in archived)) {
				archived[slug] = value;
			}
			continue;
		}
		contributed[slug] = value;
	}
	if (!(KATYA_KUZINA_SLUG in contributed)) {
		contributed[KATYA_KUZINA_SLUG] = 0;
	}

	const remainingNine = OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS.filter((s) => !isDeletedObshchakContributor(s));
	const expensesIn = Array.isArray(src.expenses) ? src.expenses : [];
	const expenses = expensesIn.map((e) => {
		if (!e || typeof e !== 'object') return e;
		const p = e.participantSlugs;
		if (Array.isArray(p) && p.length > 0) {
			if (p.includes(KATYA_KUZINA_SLUG)) return e;
			const set = new Set(p);
			const isLegacyNine = p.length === 9 && remainingNine.every((s) => set.has(s));
			if (!isLegacyNine) return e;
		}
		return { ...e, participantSlugs: [...OBSHCHAK_HISTORICAL_PARTICIPANT_SLUGS] };
	});

	return { ...src, contributedKopeks: contributed, archivedContributedKopeks: archived, expenses };
}
