import type { Spectacle, SpectaclesData } from './schemas';

export function emptySpectacles(): SpectaclesData {
	return { spectacles: [] };
}

export function sortSpectacles<T extends Pick<Spectacle, 'order' | 'id'>>(items: T[]): T[] {
	return [...items].sort((a, b) => {
		if (a.order !== b.order) return a.order - b.order;
		return a.id.localeCompare(b.id, 'ru');
	});
}

export function reindexSpectacleOrder<T extends Pick<Spectacle, 'order'>>(items: T[]): T[] {
	return items.map((item, index) => ({ ...item, order: index }));
}

export function newSpectacleId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `spectacle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function blankSpectacle(order = 0): Spectacle {
	return {
		id: newSpectacleId(),
		title: '',
		heroPhoto: '',
		directorName: '',
		directorRegalia: '',
		directorPhoto: '',
		gallery: [],
		order,
	};
}
