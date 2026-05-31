import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Цель миссии (м). */
export const TOWER_MISSION_GOAL_M = 10_000_000;
/** Уже «построено» SpaceX / Илоном (м). */
export const TOWER_MUSK_BUILT_M = 9_000_000;
/** Вклад игроков до финиша (м). */
export const TOWER_PLAYER_PHASE_M = TOWER_MISSION_GOAL_M - TOWER_MUSK_BUILT_M;

export type TowerMissionStats = {
	goalM: number;
	muskBuiltM: number;
	playerBuiltM: number;
	totalBuiltM: number;
	playerPhaseM: number;
	playerRemainingM: number;
	progressPercent: number;
	missionComplete: boolean;
};

type MissionFile = { playerMeters: number };

function missionPath(): string {
	return join(process.cwd(), 'storage', 'tower-mission.json');
}

function normalizePlayerMeters(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.max(0, Math.min(TOWER_PLAYER_PHASE_M * 2, Math.round(n)));
}

async function readMissionFile(): Promise<MissionFile> {
	try {
		const raw = await readFile(missionPath(), 'utf8');
		const j = JSON.parse(raw) as unknown;
		if (j != null && typeof j === 'object' && !Array.isArray(j)) {
			return { playerMeters: normalizePlayerMeters(Number((j as MissionFile).playerMeters ?? 0)) };
		}
	} catch (e) {
		const c = (e as NodeJS.ErrnoException).code;
		if (c !== 'ENOENT') throw e;
	}
	return { playerMeters: 0 };
}

async function writeMissionFile(data: MissionFile): Promise<void> {
	await mkdir(join(process.cwd(), 'storage'), { recursive: true });
	await writeFile(missionPath(), JSON.stringify(data, null, '\t') + '\n', 'utf8');
}

export function buildMissionStats(playerBuiltM: number): TowerMissionStats {
	const playerBuilt = normalizePlayerMeters(playerBuiltM);
	const totalBuiltM = TOWER_MUSK_BUILT_M + playerBuilt;
	const playerRemainingM = Math.max(0, TOWER_PLAYER_PHASE_M - playerBuilt);
	const progressPercent = Math.min(100, (totalBuiltM / TOWER_MISSION_GOAL_M) * 100);
	return {
		goalM: TOWER_MISSION_GOAL_M,
		muskBuiltM: TOWER_MUSK_BUILT_M,
		playerBuiltM: playerBuilt,
		totalBuiltM,
		playerPhaseM: TOWER_PLAYER_PHASE_M,
		playerRemainingM,
		progressPercent,
		missionComplete: playerBuilt >= TOWER_PLAYER_PHASE_M,
	};
}

export async function readTowerMissionStats(): Promise<TowerMissionStats> {
	const f = await readMissionFile();
	return buildMissionStats(f.playerMeters);
}

/** Добавить метры за одну игру к общему вкладу людей. */
export async function addPlayerMissionMeters(delta: number): Promise<TowerMissionStats> {
	const add = Math.max(0, Math.round(delta));
	if (add <= 0) return readTowerMissionStats();
	const f = await readMissionFile();
	f.playerMeters = normalizePlayerMeters(f.playerMeters + add);
	await writeMissionFile(f);
	return buildMissionStats(f.playerMeters);
}
