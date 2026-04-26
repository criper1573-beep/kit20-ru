import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import { hasValidAdminSession, unauthorizedJson } from '../../../lib/adminApiAuth';
import {
	readBirthdayDialLayoutFile,
	writeBirthdayDialLayoutFile,
	type BirthdayLabelOverride,
} from '../../../lib/birthdayDialLayoutFile';

export const prerender = false;

const entrySchema = z.object({
	x: z.number().finite(),
	y: z.number().finite(),
	rot: z.number().finite(),
});

const putBodySchema = z.record(z.string(), entrySchema);

export const GET: APIRoute = async ({ cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	const layout = await readBirthdayDialLayoutFile();
	return new Response(JSON.stringify({ layout }), {
		status: 200,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
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
	const body = (json as { layout?: unknown })?.layout;
	const parsed = putBodySchema.safeParse(body);
	if (!parsed.success) {
		return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	/** viewBox: отбрасываем явный мусор, но пускаем широкий диапазон */
	const cleaned: Record<string, BirthdayLabelOverride> = {};
	for (const [slug, e] of Object.entries(parsed.data)) {
		if (slug.length > 200) continue;
		if (Math.abs(e.x) > 5000 || Math.abs(e.y) > 5000 || Math.abs(e.rot) > 1e6) continue;
		cleaned[slug] = e;
	}
	try {
		await writeBirthdayDialLayoutFile(cleaned);
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
