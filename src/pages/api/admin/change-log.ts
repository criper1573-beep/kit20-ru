import type { APIRoute } from 'astro';
import { hasValidAdminSession, unauthorizedJson } from '../../../lib/adminApiAuth';
import { listAdminChangeLog, rollbackAdminChangeById } from '../../../lib/adminChangeLog';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, url }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}

	const limitRaw = Number(url.searchParams.get('limit') ?? 100);
	const limit = Number.isFinite(limitRaw) ? limitRaw : 100;
	try {
		const entries = await listAdminChangeLog(limit);
		return new Response(JSON.stringify({ entries }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Ошибка чтения журнала';
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};

export const POST: APIRoute = async ({ cookies, request }) => {
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

	const payload = json as { id?: unknown };
	const id = typeof payload.id === 'string' ? payload.id : '';
	if (!id) {
		return new Response(JSON.stringify({ error: 'Нужен id изменения' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	try {
		const result = await rollbackAdminChangeById(id);
		return new Response(JSON.stringify({ ok: true, ...result }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Ошибка отката';
		const status = msg === 'Изменение не найдено' ? 404 : 500;
		return new Response(JSON.stringify({ error: msg }), {
			status,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};
