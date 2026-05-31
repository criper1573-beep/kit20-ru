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

/** Общий прогресс: SpaceX + сумма totalMeters всех сессий в рейтинге. */
export function buildMissionStats(playerBuiltM: number): TowerMissionStats {
	const playerBuilt = Math.max(0, Math.round(playerBuiltM));
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
