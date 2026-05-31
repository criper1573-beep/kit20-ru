import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GAME_ACTOR_NAMES } from './gameActorNames';

type PoolState = { used: string[] };

function poolPath(): string {
	return join(process.cwd(), 'storage', 'game-actor-name-pool.json');
}

async function readPool(): Promise<PoolState> {
	try {
		const raw = await readFile(poolPath(), 'utf8');
		const j = JSON.parse(raw) as unknown;
		if (j != null && typeof j === 'object' && !Array.isArray(j)) {
			const used = (j as { used?: unknown }).used;
			if (Array.isArray(used)) {
				const names = used.filter(
					(n): n is (typeof GAME_ACTOR_NAMES)[number] =>
						typeof n === 'string' && (GAME_ACTOR_NAMES as readonly string[]).includes(n),
				);
				return { used: names };
			}
		}
	} catch (e) {
		const c = (e as NodeJS.ErrnoException).code;
		if (c !== 'ENOENT') throw e;
	}
	return { used: [] };
}

async function writePool(state: PoolState): Promise<void> {
	await mkdir(join(process.cwd(), 'storage'), { recursive: true });
	await writeFile(poolPath(), JSON.stringify(state, null, '\t') + '\n', 'utf8');
}

/** Следующее имя актёра: без повторов в пуле и среди имён уже в рейтинге. */
export async function pickNextActorName(takenInScores: string[] = []): Promise<string> {
	const state = await readPool();
	const usedSet = new Set(state.used);
	const takenSet = new Set(takenInScores.map((n) => n.trim()).filter(Boolean));
	let available = GAME_ACTOR_NAMES.filter((n) => !usedSet.has(n) && !takenSet.has(n));
	if (available.length === 0) {
		state.used = [];
		available = GAME_ACTOR_NAMES.filter((n) => !takenSet.has(n));
	}
	if (available.length === 0) {
		available = [...GAME_ACTOR_NAMES];
	}
	const pick = available[Math.floor(Math.random() * available.length)]!;
	state.used.push(pick);
	await writePool(state);
	return pick;
}
