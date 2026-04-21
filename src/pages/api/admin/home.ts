import type { APIRoute } from 'astro';
import { z } from 'astro:content';
import {
	homeFrontmatterSchema,
	homeSemesterBarSchema,
	homeTitleFontSchema,
	homeTypographyWeightSchema,
} from '../../../lib/schemas';
import { readHome, writeHome } from '../../../lib/siteContent';
import { hasValidAdminSession, unauthorizedJson } from '../../../lib/adminApiAuth';
import { readFile } from 'node:fs/promises';
import { logAdminContentChange } from '../../../lib/adminChangeLog';
import type { HomeFrontmatter } from '../../../lib/schemas';

export const prerender = false;

function mergeHomeFromRequest(prev: HomeFrontmatter, json: Record<string, unknown>): HomeFrontmatter {
	const next: HomeFrontmatter = { ...prev };

	if (typeof json.title === 'string') next.title = json.title;
	if (typeof json.subtitle === 'string') next.subtitle = json.subtitle.trim() || undefined;
	if (typeof json.photo === 'string') next.photo = json.photo.trim() || undefined;
	if (typeof json.tickerTop === 'string') next.tickerTop = json.tickerTop;
	if (typeof json.tickerBottom === 'string') next.tickerBottom = json.tickerBottom;

	if (json.titleFont !== undefined) {
		const r = homeTitleFontSchema.safeParse(json.titleFont);
		if (r.success) next.titleFont = r.data;
	}
	if (json.titleWeight !== undefined) {
		const r = homeTypographyWeightSchema.safeParse(json.titleWeight);
		if (r.success) next.titleWeight = r.data;
	}
	if (typeof json.titleItalic === 'boolean') next.titleItalic = json.titleItalic;

	if (json.subtitleFont !== undefined) {
		const r = homeTitleFontSchema.safeParse(json.subtitleFont);
		if (r.success) next.subtitleFont = r.data;
	}
	if (json.subtitleWeight !== undefined) {
		const r = homeTypographyWeightSchema.safeParse(json.subtitleWeight);
		if (r.success) next.subtitleWeight = r.data;
	}
	if (typeof json.subtitleItalic === 'boolean') next.subtitleItalic = json.subtitleItalic;

	if (Array.isArray(json.semesters)) {
		const sem = z.array(homeSemesterBarSchema).safeParse(json.semesters);
		if (sem.success) next.semesters = sem.data;
	}

	return next;
}

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
	const body = json as Record<string, unknown>;
	const mdBody = typeof body.body === 'string' ? body.body : '';
	const targetPath = 'src/content/home.md';
	let beforeRaw = '';
	try {
		beforeRaw = await readFile(targetPath, 'utf8');
		const prev = await readHome();
		const merged = mergeHomeFromRequest(prev.data, body);
		const parsed = homeFrontmatterSchema.safeParse(merged);
		if (!parsed.success) {
			return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
				status: 400,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			});
		}
		await writeHome(parsed.data, mdBody);
		const afterRaw = await readFile(targetPath, 'utf8');
		await logAdminContentChange({
			entity: 'home',
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
