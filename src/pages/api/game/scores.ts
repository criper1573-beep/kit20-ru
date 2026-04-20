import type { APIRoute } from 'astro';
import { addGameScore, readGameScores } from '../../../lib/gameScores';

export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		const scores = await readGameScores();
		return new Response(JSON.stringify({ scores: scores.slice(0, 20) }), {
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

	const payload = json as { name?: unknown; score?: unknown; sessionId?: unknown };
	const name = typeof payload.name === 'string' ? payload.name : '';
	const score = Number(payload.score ?? 0);
	const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId : '';
	if (!name.trim()) {
		return new Response(JSON.stringify({ error: 'Введите имя' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	try {
		const scores = await addGameScore(name, score, sessionId);
		return new Response(JSON.stringify({ ok: true, scores: scores.slice(0, 20) }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Ошибка сохранения';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};
