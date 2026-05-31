import fs from 'node:fs/promises';
import path from 'node:path';
import { pickNextActorName } from './gameActorNamePool';
import { buildMissionStats, TOWER_MUSK_BUILT_M, type TowerMissionStats } from './towerMission';

export interface GameScore {
	name: string;
	/** Сумма всех попыток за сессию — идёт в общий прогресс миссии. */
	totalMeters: number;
	/** Лучшая одна попытка — для соревновательного рейтинга. */
	bestMeters: number;
	createdAt: string;
	sessionId?: string;
}

export const ELON_MUSK_LEADERBOARD_NAME = 'Илон Маск';

function elonMuskLeaderboardEntry(): GameScore {
	return {
		name: ELON_MUSK_LEADERBOARD_NAME,
		totalMeters: 0,
		bestMeters: TOWER_MUSK_BUILT_M,
		createdAt: '2026-01-01T00:00:00.000Z',
	};
}

export interface RecordTowerRunResult {
	totalLeaderboard: GameScore[];
	bestLeaderboard: GameScore[];
	name: string;
	saved: boolean;
	mission: TowerMissionStats;
	sessionTotalMeters: number;
	sessionBestMeters: number;
}

const SCORE_FILE = path.join(process.cwd(), 'src', 'content', 'game-scores.json');

function normalizeName(input: string): string {
	return input.replace(/\s+/g, ' ').trim().slice(0, 24);
}

function normalizeMeters(input: number): number {
	if (!Number.isFinite(input)) return 0;
	return Math.max(0, Math.min(99_999_999, Math.round(input)));
}

function normalizeSessionId(input: string): string {
	return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

function parseRow(row: unknown): GameScore | null {
	const obj = row as Partial<GameScore> & { score?: number };
	const name = normalizeName(String(obj.name ?? ''));
	if (!name || name === ELON_MUSK_LEADERBOARD_NAME) return null;

	const legacy = normalizeMeters(Number(obj.score ?? 0));
	let bestMeters = normalizeMeters(Number(obj.bestMeters ?? legacy));
	let totalMeters = normalizeMeters(Number(obj.totalMeters ?? legacy));
	if (totalMeters < bestMeters) totalMeters = bestMeters;

	return {
		name,
		bestMeters,
		totalMeters,
		createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date(0).toISOString(),
		sessionId: normalizeSessionId(String(obj.sessionId ?? '')) || undefined,
	};
}

export function sumPlayerTotalMeters(players: GameScore[]): number {
	return players.reduce((s, r) => s + r.totalMeters, 0);
}

export function missionFromPlayers(players: GameScore[]): TowerMissionStats {
	return buildMissionStats(sumPlayerTotalMeters(players));
}

export async function readPlayerScores(): Promise<GameScore[]> {
	try {
		const raw = await fs.readFile(SCORE_FILE, 'utf8');
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map(parseRow)
			.filter((r): r is GameScore => r != null)
			.sort((a, b) => (b.totalMeters - a.totalMeters) || a.createdAt.localeCompare(b.createdAt));
	} catch {
		return [];
	}
}

/** Рейтинг вклада за сессию (сумма всех игр). */
export async function readTotalLeaderboard(): Promise<GameScore[]> {
	const players = await readPlayerScores();
	return [...players]
		.sort((a, b) => (b.totalMeters - a.totalMeters) || a.createdAt.localeCompare(b.createdAt))
		.slice(0, 100);
}

/** Рейтинг лучшей попытки; #1 — Илон Маск (SpaceX). */
export async function readBestLeaderboard(): Promise<GameScore[]> {
	const players = await readPlayerScores();
	return [elonMuskLeaderboardEntry(), ...players]
		.sort((a, b) => (b.bestMeters - a.bestMeters) || a.createdAt.localeCompare(b.createdAt))
		.slice(0, 100);
}

export async function readLeaderboardPayload(): Promise<{
	mission: TowerMissionStats;
	totalLeaderboard: GameScore[];
	bestLeaderboard: GameScore[];
}> {
	const players = await readPlayerScores();
	return {
		mission: missionFromPlayers(players),
		totalLeaderboard: [...players]
			.sort((a, b) => (b.totalMeters - a.totalMeters) || a.createdAt.localeCompare(b.createdAt))
			.slice(0, 20),
		bestLeaderboard: [elonMuskLeaderboardEntry(), ...players]
			.sort((a, b) => (b.bestMeters - a.bestMeters) || a.createdAt.localeCompare(b.createdAt))
			.slice(0, 20),
	};
}

/** @deprecated */
export async function readLeaderboard(): Promise<GameScore[]> {
	return readBestLeaderboard();
}

/** @deprecated */
export async function readGameScores(): Promise<GameScore[]> {
	return readBestLeaderboard();
}

export async function recordTowerRun(
	runMetersInput: number,
	sessionIdInput: string,
	nameInput?: string | null,
): Promise<RecordTowerRunResult> {
	const runMeters = normalizeMeters(runMetersInput);
	const sessionId = normalizeSessionId(sessionIdInput);
	const userName = nameInput != null ? normalizeName(nameInput) : '';

	const emptyPayload = async () => {
		const p = await readLeaderboardPayload();
		return {
			totalLeaderboard: p.totalLeaderboard,
			bestLeaderboard: p.bestLeaderboard,
			name: userName,
			saved: false,
			mission: p.mission,
			sessionTotalMeters: 0,
			sessionBestMeters: 0,
		};
	};

	if (!sessionId) return emptyPayload();

	const prev = await readPlayerScores();
	const existingIndex = prev.findIndex((row) => row.sessionId === sessionId);

	let finalName = userName;
	if (!finalName) {
		if (existingIndex >= 0) {
			finalName = prev[existingIndex]!.name;
		} else if (runMeters > 0) {
			finalName = await pickNextActorName();
		} else {
			return emptyPayload();
		}
	}

	let nextBase = [...prev];
	let saved = false;

	if (existingIndex >= 0) {
		const row = prev[existingIndex]!;
		const nameChanged = Boolean(userName && userName !== row.name);
		if (runMeters <= 0 && !nameChanged) {
			const p = await readLeaderboardPayload();
			return {
				totalLeaderboard: p.totalLeaderboard,
				bestLeaderboard: p.bestLeaderboard,
				name: row.name,
				saved: false,
				mission: p.mission,
				sessionTotalMeters: row.totalMeters,
				sessionBestMeters: row.bestMeters,
			};
		}
		const newTotal = row.totalMeters + runMeters;
		const newBest = Math.max(row.bestMeters, runMeters);
		nextBase[existingIndex] = {
			...row,
			name: finalName,
			totalMeters: newTotal,
			bestMeters: newBest,
			sessionId,
		};
		saved = true;
	} else if (runMeters > 0) {
		nextBase.push({
			name: finalName,
			totalMeters: runMeters,
			bestMeters: runMeters,
			createdAt: new Date().toISOString(),
			sessionId,
		});
		saved = true;
	} else {
		return emptyPayload();
	}

	const stored = nextBase
		.sort((a, b) => (b.totalMeters - a.totalMeters) || a.createdAt.localeCompare(b.createdAt))
		.slice(0, 100);

	await fs.writeFile(SCORE_FILE, JSON.stringify(stored, null, 2), 'utf8');

	const sessionRow = stored.find((r) => r.sessionId === sessionId);
	const payload = await readLeaderboardPayload();

	return {
		totalLeaderboard: payload.totalLeaderboard,
		bestLeaderboard: payload.bestLeaderboard,
		name: finalName,
		saved,
		mission: payload.mission,
		sessionTotalMeters: sessionRow?.totalMeters ?? runMeters,
		sessionBestMeters: sessionRow?.bestMeters ?? runMeters,
	};
}

/** @deprecated */
export async function saveGameScore(
	scoreInput: number,
	sessionIdInput: string,
	nameInput?: string | null,
): Promise<{ scores: GameScore[]; name: string; saved: boolean }> {
	const r = await recordTowerRun(scoreInput, sessionIdInput, nameInput);
	return { scores: r.bestLeaderboard, name: r.name, saved: r.saved };
}

/** @deprecated */
export async function addGameScore(nameInput: string, scoreInput: number, sessionIdInput = ''): Promise<GameScore[]> {
	const r = await recordTowerRun(scoreInput, sessionIdInput, nameInput);
	return r.bestLeaderboard;
}
