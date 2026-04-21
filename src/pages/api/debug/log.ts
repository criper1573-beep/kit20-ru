import type { APIRoute } from 'astro';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const prerender = false;

const LOG_DIR = join(process.cwd(), 'storage');
const LOG_PATH = join(LOG_DIR, 'debug-cdc693.log');

export const POST: APIRoute = async ({ request }) => {
	try {
		const raw = await request.text();
		if (!raw.trim()) {
			return new Response(JSON.stringify({ error: 'empty payload' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			});
		}
		await mkdir(LOG_DIR, { recursive: true });
		await appendFile(LOG_PATH, `${raw.trim()}\n`, 'utf8');
		return new Response(null, { status: 204 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'log write failed';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};
