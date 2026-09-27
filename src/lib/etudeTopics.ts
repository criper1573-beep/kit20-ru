import type { ClassEtude, EtudeTopic, EtudeTopicsData } from './schemas';

export function sortTopicsNewestLeft<T extends Pick<EtudeTopic, 'id' | 'createdAt'>>(topics: T[]): T[] {
	return [...topics].sort((a, b) => {
		const tb = Date.parse(b.createdAt);
		const ta = Date.parse(a.createdAt);
		const nb = Number.isFinite(tb) ? tb : 0;
		const na = Number.isFinite(ta) ? ta : 0;
		if (nb !== na) return nb - na;
		return b.id.localeCompare(a.id, 'ru');
	});
}

export function etudesForTopic<T extends Pick<ClassEtude, 'topicId'>>(etudes: T[], topicId: string): T[] {
	return etudes.filter((e) => e.topicId === topicId);
}

export function newContentId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pickActiveTopic<T extends Pick<EtudeTopic, 'id' | 'createdAt'>>(
	topics: T[],
	requestedId: string | null | undefined,
): T | null {
	const ordered = sortTopicsNewestLeft(topics);
	if (ordered.length === 0) return null;
	if (requestedId) {
		const hit = ordered.find((t) => t.id === requestedId);
		if (hit) return hit;
	}
	return ordered[0] ?? null;
}

export function emptyEtudeTopics(): EtudeTopicsData {
	return { topics: [], etudes: [] };
}

/** В «Органичное молчание» названия этюдов не показываем и не требуем. */
export function topicHidesEtudeTitle(topic: { id?: string; title?: string } | null | undefined): boolean {
	if (!topic) return false;
	if (topic.id === 'organichnoe-molchanie') return true;
	return (topic.title ?? '').trim().toLocaleLowerCase('ru') === 'органичное молчание';
}
