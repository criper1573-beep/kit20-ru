import fs from 'node:fs/promises';
import path from 'node:path';

export interface JumpGameScore {
	name: string;
	score: number;
	createdAt: string;
	sessionId?: string;
}

const SCORE_FILE = path.join(process.cwd(), 'src', 'content', 'game-scores-jump.json');

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

export async function readJumpGameScores(): Promise<JumpGameScore[]> {
	try {
		const raw = await fs.readFile(SCORE_FILE, 'utf8');
		const parsed = JSON.parse(raw) as unknown;
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((row) => {
				const obj = row as Partial<JumpGameScore> & { bestMeters?: number };
				const score = normalizeScore(Number(obj.score ?? obj.bestMeters ?? 0));
				return {
					name: normalizeName(String(obj.name ?? '')),
					score,
					createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date(0).toISOString(),
					sessionId: normalizeSessionId(String(obj.sessionId ?? '')) || undefined,
				};
			})
			.filter((r) => r.name.length > 0)
			.sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt));
	} catch {
		return [];
	}
}

export async function addJumpGameScore(
	nameInput: string,
	scoreInput: number,
	sessionIdInput = '',
): Promise<JumpGameScore[]> {
	const name = normalizeName(nameInput);
	const score = normalizeScore(scoreInput);
	const sessionId = normalizeSessionId(sessionIdInput);
	if (!name) return readJumpGameScores();

	const prev = await readJumpGameScores();
	const existingIndex = sessionId ? prev.findIndex((row) => row.sessionId === sessionId) : -1;
	let nextBase = [...prev];
	if (existingIndex >= 0) {
		const row = prev[existingIndex]!;
		if (score >= row.score) {
			nextBase[existingIndex] = { ...row, name, score, sessionId };
		}
	} else {
		nextBase = [
			...prev,
			{ name, score, createdAt: new Date().toISOString(), sessionId: sessionId || undefined },
		];
	}

	const next = nextBase
		.sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt))
		.slice(0, 100);

	await fs.mkdir(path.dirname(SCORE_FILE), { recursive: true });
	await fs.writeFile(SCORE_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
	return next;
}
