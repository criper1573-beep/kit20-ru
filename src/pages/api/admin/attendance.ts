import type { APIRoute } from 'astro';
import { attendanceFrontmatterSchema } from '../../../lib/schemas';
import { readAttendance, writeAttendance } from '../../../lib/siteContent';
import { hasValidAdminSession, unauthorizedJson } from '../../../lib/adminApiAuth';
import { readFile } from 'node:fs/promises';
import { logAdminContentChange } from '../../../lib/adminChangeLog';

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
	const payload = json as { lessons?: unknown; body?: unknown };
	const parsed = attendanceFrontmatterSchema.safeParse({
		lessons: payload.lessons,
	});
	if (!parsed.success) {
		return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	const mdBody = typeof payload.body === 'string' ? payload.body : '';
	const targetPath = 'src/content/attendance.md';
	let beforeRaw = '';
	try {
		beforeRaw = await readFile(targetPath, 'utf8');
		const current = await readAttendance();
		await writeAttendance(parsed.data, mdBody || current.body);
		const afterRaw = await readFile(targetPath, 'utf8');
		await logAdminContentChange({
			entity: 'attendance',
			targetPath,
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

export const GET: APIRoute = async ({ cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	try {
		const a = await readAttendance();
		return new Response(JSON.stringify({ data: a.data, body: a.body }), {
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
