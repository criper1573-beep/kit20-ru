import type { APIRoute } from 'astro';
import { studentFrontmatterSchema } from '../../../../lib/schemas';
import { readStudent, writeStudent } from '../../../../lib/siteContent';
import { hasValidAdminSession, unauthorizedJson } from '../../../../lib/adminApiAuth';
import { readFile } from 'node:fs/promises';
import { logAdminContentChange } from '../../../../lib/adminChangeLog';

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	const slug = params.slug;
	if (!slug) {
		return new Response(JSON.stringify({ error: 'Нет slug' }), { status: 400 });
	}
	try {
		const s = await readStudent(slug);
		return new Response(JSON.stringify({ data: s.data, body: s.body }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Не найдено' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	const slug = params.slug;
	if (!slug) {
		return new Response(JSON.stringify({ error: 'Нет slug' }), { status: 400 });
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
	const payload = json as { data?: unknown; body?: unknown };
	const parsed = studentFrontmatterSchema.safeParse(payload?.data);
	if (!parsed.success) {
		return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	if (parsed.data.slug !== slug) {
		return new Response(JSON.stringify({ error: 'slug в данных не совпадает с URL' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	const mdBody = typeof payload.body === 'string' ? payload.body : '';
	const targetPath = `src/content/students/${slug}.md`;
	let beforeRaw = '';
	try {
		beforeRaw = await readFile(targetPath, 'utf8');
		await writeStudent(parsed.data, mdBody);
		const afterRaw = await readFile(targetPath, 'utf8');
		await logAdminContentChange({
			entity: 'student',
			targetPath,
			beforeContent: beforeRaw,
			afterContent: afterRaw,
			slug,
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
