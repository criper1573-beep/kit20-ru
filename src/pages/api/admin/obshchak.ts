import type { APIRoute } from 'astro';
import { obshchakDataSchema } from '../../../lib/schemas';
import { readObshchak, writeObshchak } from '../../../lib/siteContent';
import { hasValidAdminSession, unauthorizedJson } from '../../../lib/adminApiAuth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	try {
		const data = await readObshchak();
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
	const parsed = obshchakDataSchema.safeParse(body);
	if (!parsed.success) {
		return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	try {
		await writeObshchak(parsed.data);
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
