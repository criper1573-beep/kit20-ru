import type { APIRoute } from 'astro';
import { readLeaderboardPayload, recordTowerRun } from '../../../lib/gameScores';

export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		const data = await readLeaderboardPayload();
		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Ошибка чтения рейтинга';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};

export const POST: APIRoute = async ({ request }) => {
	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Некорректный JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	const payload = json as { name?: unknown; score?: unknown; runMeters?: unknown; sessionId?: unknown };
	const nameRaw = typeof payload.name === 'string' ? payload.name : undefined;
	const runMeters = Number(payload.runMeters ?? payload.score ?? 0);
	const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';
	if (!sessionId.trim()) {
		return new Response(JSON.stringify({ error: 'Нет sessionId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	try {
		const result = await recordTowerRun(runMeters, sessionId, nameRaw);
		return new Response(
			JSON.stringify({
				ok: true,
				saved: result.saved,
				name: result.name,
				mission: result.mission,
				sessionTotalMeters: result.sessionTotalMeters,
				sessionBestMeters: result.sessionBestMeters,
				totalLeaderboard: result.totalLeaderboard,
				bestLeaderboard: result.bestLeaderboard,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			},
		);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Ошибка сохранения';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};
