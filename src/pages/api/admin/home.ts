import type { APIRoute } from 'astro';
import { homeFrontmatterSchema } from '../../../lib/schemas';
import { readHome, writeHome } from '../../../lib/siteContent';

export const prerender = false;

export const PUT: APIRoute = async ({ request }) => {
	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Некорректный JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	const body = json as { title?: string; subtitle?: string; body?: string };
	const parsed = homeFrontmatterSchema.safeParse({
		title: body.title,
		subtitle: body.subtitle,
	});
	if (!parsed.success) {
		return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	const mdBody = typeof body.body === 'string' ? body.body : '';
	try {
		await writeHome(parsed.data, mdBody);
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

export const GET: APIRoute = async () => {
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
