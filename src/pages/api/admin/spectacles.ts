import type { APIRoute } from 'astro';
import { spectaclesDataSchema } from '../../../lib/schemas';
import { readSpectacles, writeSpectacles } from '../../../lib/siteContent';
import { hasValidAdminSession, unauthorizedJson } from '../../../lib/adminApiAuth';
import { readFile } from 'node:fs/promises';
import { logAdminContentChange } from '../../../lib/adminChangeLog';

export const prerender = false;

const TARGET_PATH = 'src/content/spectacles.json';

export const GET: APIRoute = async ({ cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	try {
		const data = await readSpectacles();
		return new Response(JSON.stringify({ data }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Ошибка чтения';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};

export const PUT: APIRoute = async ({ request, cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Некорректный JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	const body = (json as { data?: unknown })?.data ?? json;
	const parsed = spectaclesDataSchema.safeParse(body);
	if (!parsed.success) {
		return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	const ids = parsed.data.spectacles.map((s) => s.id);
	if (new Set(ids).size !== ids.length) {
		return new Response(JSON.stringify({ error: 'id спектаклей должны быть уникальны' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	try {
		let beforeRaw = '';
		try {
			beforeRaw = await readFile(TARGET_PATH, 'utf8');
		} catch {
			beforeRaw = '';
		}
		await writeSpectacles(parsed.data);
		const afterRaw = await readFile(TARGET_PATH, 'utf8');
		await logAdminContentChange({
			entity: 'spectacles',
			targetPath: TARGET_PATH,
			beforeContent: beforeRaw,
			afterContent: afterRaw,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Ошибка записи';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
};
