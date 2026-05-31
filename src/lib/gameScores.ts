import fs from 'node:fs/promises';
import path from 'node:path';
import { pickNextActorName } from './gameActorNamePool';
import { addPlayerMissionMeters, readTowerMissionStats, type TowerMissionStats } from './towerMission';

export interface GameScore {
	name: string;
	score: number;
	createdAt: string;
	sessionId?: string;
}

export interface RecordTowerRunResult {
	scores: GameScore[];
	name: string;
	saved: boolean;
	mission: TowerMissionStats;
	leaderboardUpdated: boolean;
}

const SCORE_FILE = path.join(process.cwd(), 'src', 'content', 'game-scores.json');

function normalizeName(input: string): string {
	return input.replace(/\s+/g, ' ').trim().slice(0, 24);
}

/** Метры за попытку / лучший результат сессии. */
function normalizeMeters(input: number): number {
	if (!Number.isFinite(input)) return 0;
	return Math.max(0, Math.min(99_999, Math.round(input)));
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
					score: normalizeMeters(Number(obj.score ?? 0)),
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
 * Зафиксировать попытку: метры идут в общую миссию; в рейтинг — лучший результат сессии.
 */
export async function recordTowerRun(
	runMetersInput: number,
	sessionIdInput: string,
	nameInput?: string | null,
): Promise<RecordTowerRunResult> {
	const runMeters = normalizeMeters(runMetersInput);
	const sessionId = normalizeSessionId(sessionIdInput);
	const userName = nameInput != null ? normalizeName(nameInput) : '';

	if (!sessionId) {
		return {
			scores: await readGameScores(),
			name: userName,
			saved: false,
			mission: await readTowerMissionStats(),
			leaderboardUpdated: false,
		};
	}

	const mission = runMeters > 0 ? await addPlayerMissionMeters(runMeters) : await readTowerMissionStats();

	const prev = await readGameScores();
	const existingIndex = prev.findIndex((row) => row.sessionId === sessionId);

	let finalName = userName;
	if (!finalName) {
		if (existingIndex >= 0) {
			finalName = prev[existingIndex]!.name;
		} else if (runMeters > 0) {
			finalName = await pickNextActorName();
		} else {
			return {
				scores: prev,
				name: '',
				saved: false,
				mission,
				leaderboardUpdated: false,
			};
		}
	}

	let nextBase = [...prev];
	let saved = false;
	let leaderboardUpdated = false;

	if (existingIndex >= 0) {
		const row = prev[existingIndex]!;
		const scoreImproved = runMeters > row.score;
		const nameChanged = Boolean(userName && userName !== row.name);
		if (scoreImproved || nameChanged) {
			nextBase[existingIndex] = {
				...row,
				name: finalName,
				score: scoreImproved ? runMeters : row.score,
				sessionId,
			};
			saved = true;
			leaderboardUpdated = scoreImproved;
		} else {
			return { scores: prev, name: row.name, saved: false, mission, leaderboardUpdated: false };
		}
	} else if (runMeters > 0) {
		nextBase.push({
			name: finalName,
			score: runMeters,
			createdAt: new Date().toISOString(),
			sessionId,
		});
		saved = true;
		leaderboardUpdated = true;
	} else {
		return { scores: prev, name: finalName, saved: false, mission, leaderboardUpdated: false };
	}

	const next = nextBase
		.sort((a, b) => (b.score - a.score) || a.createdAt.localeCompare(b.createdAt))
		.slice(0, 100);

	await fs.writeFile(SCORE_FILE, JSON.stringify(next, null, 2), 'utf8');
	return { scores: next, name: finalName, saved, mission, leaderboardUpdated };
}

/** @deprecated */
export async function saveGameScore(
	scoreInput: number,
	sessionIdInput: string,
	nameInput?: string | null,
): Promise<{ scores: GameScore[]; name: string; saved: boolean }> {
	const r = await recordTowerRun(scoreInput, sessionIdInput, nameInput);
	return { scores: r.scores, name: r.name, saved: r.saved };
}

/** @deprecated */
export async function addGameScore(nameInput: string, scoreInput: number, sessionIdInput = ''): Promise<GameScore[]> {
	const r = await recordTowerRun(scoreInput, sessionIdInput, nameInput);
	return r.scores;
}
