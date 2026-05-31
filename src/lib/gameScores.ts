import fs from 'node:fs/promises';
import path from 'node:path';
import { pickNextActorName } from './gameActorNamePool';

export interface GameScore {
	name: string;
	score: number;
	createdAt: string;
	sessionId?: string;
}

export interface SaveGameScoreResult {
	scores: GameScore[];
	name: string;
	saved: boolean;
}

const SCORE_FILE = path.join(process.cwd(), 'src', 'content', 'game-scores.json');

function normalizeName(input: string): string {
	return input.replace(/\s+/g, ' ').trim().slice(0, 24);
}

function normalizeScore(input: number): number {
	if (!Number.isFinite(input)) return 0;
	return Math.max(0, Math.min(999_999, Math.round(input * 100) / 100));
}

function normalizeSessionId(input: string): string {
	return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

export async function readGameScores(): Promise<GameScore[]> {
	try {
		const raw = await fs.readFile(SCORE_FILE, 'utf8');
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((row) => {
				const obj = row as Partial<GameScore>;
				return {
					name: normalizeName(String(obj.name ?? '')),
					score: normalizeScore(Number(obj.score ?? 0)),
					createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date(0).toISOString(),
					sessionId: normalizeSessionId(String(obj.sessionId ?? '')) || undefined,
				};
			})
			.filter((r) => r.name.length > 0)
			.sort((a, b) => (b.score - a.score) || a.createdAt.localeCompare(b.createdAt));
	} catch {
		return [];
	}
}

/**
 * Сохранить лучший результат сессии.
 * nameInput пустой → имя актёра из пула (новая запись) или прежнее имя (обновление).
 */
export async function saveGameScore(
	scoreInput: number,
	sessionIdInput: string,
	nameInput?: string | null,
): Promise<SaveGameScoreResult> {
	const score = normalizeScore(scoreInput);
	const sessionId = normalizeSessionId(sessionIdInput);
	const userName = nameInput != null ? normalizeName(nameInput) : '';

	if (!sessionId || score <= 0) {
		return { scores: await readGameScores(), name: userName, saved: false };
	}

	const prev = await readGameScores();
	const existingIndex = prev.findIndex((row) => row.sessionId === sessionId);

	let finalName = userName;
	if (!finalName) {
		if (existingIndex >= 0) {
			finalName = prev[existingIndex]!.name;
		} else {
			finalName = await pickNextActorName();
		}
	}

	let nextBase = [...prev];
	let saved = false;

	if (existingIndex >= 0) {
		const row = prev[existingIndex]!;
		const scoreImproved = score > row.score;
		const nameChanged = Boolean(userName && userName !== row.name);
		if (scoreImproved || nameChanged) {
			nextBase[existingIndex] = {
				...row,
				name: finalName,
				score: scoreImproved ? score : row.score,
				sessionId,
			};
			saved = true;
		} else {
			return { scores: prev, name: row.name, saved: false };
		}
	} else {
		nextBase.push({
			name: finalName,
			score,
			createdAt: new Date().toISOString(),
			sessionId,
		});
		saved = true;
	}

	const next = nextBase
		.sort((a, b) => (b.score - a.score) || a.createdAt.localeCompare(b.createdAt))
		.slice(0, 100);

	await fs.writeFile(SCORE_FILE, JSON.stringify(next, null, 2), 'utf8');
	return { scores: next, name: finalName, saved };
}

/** @deprecated используйте saveGameScore */
export async function addGameScore(nameInput: string, scoreInput: number, sessionIdInput = ''): Promise<GameScore[]> {
	const r = await saveGameScore(scoreInput, sessionIdInput, nameInput);
	return r.scores;
}
