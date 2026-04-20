import type { APIRoute } from 'astro';
import { homeFrontmatterSchema } from '../../../lib/schemas';
import { readHome, writeHome } from '../../../lib/siteContent';
import { hasValidAdminSession, unauthorizedJson } from '../../../lib/adminApiAuth';

export const prerender = false;

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
	const body = json as { title?: string; subtitle?: string; photo?: string; body?: string };
	const parsed = homeFrontmatterSchema.safeParse({
		title: body.title,
		subtitle: body.subtitle,
		photo: body.photo,
	});
	if (!parsed.success) {
		return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	const mdBody = typeof body.body === 'string' ? body.body : '';
	try {
		const prev = await readHome();
		const merged = { ...parsed.data };
		if (prev.data.semesters !== undefined) merged.semesters = prev.data.semesters;
		await writeHome(merged, mdBody);
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

export const GET: APIRoute = async ({ cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	try {
		const h = await readHome();
		return new Response(JSON.stringify({ data: h.data, body: h.body }), {
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
