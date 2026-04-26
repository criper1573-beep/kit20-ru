import type { APIRoute } from 'astro';
import { readBirthdayDialLayoutFile } from '../../lib/birthdayDialLayoutFile';

export const prerender = false;

export const GET: APIRoute = async () => {
	try {
		const layout = await readBirthdayDialLayoutFile();
		return new Response(JSON.stringify({ layout }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Read error';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};
