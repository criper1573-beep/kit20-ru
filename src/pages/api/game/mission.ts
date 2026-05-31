import type { APIRoute } from 'astro';
import { readTowerMissionStats } from '../../../lib/towerMission';

export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		const mission = await readTowerMissionStats();
		return new Response(JSON.stringify({ mission }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Ошибка чтения миссии';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};
