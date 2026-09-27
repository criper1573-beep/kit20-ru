import type { APIRoute } from 'astro';
import { etudeTopicsDataSchema } from '../../../lib/schemas';
import { readEtudeTopics, writeEtudeTopics } from '../../../lib/siteContent';
import { hasValidAdminSession, unauthorizedJson } from '../../../lib/adminApiAuth';
import { readFile } from 'node:fs/promises';
import { logAdminContentChange } from '../../../lib/adminChangeLog';

export const prerender = false;

const TARGET_PATH = 'src/content/etude-topics.json';

export const GET: APIRoute = async ({ cookies }) => {
	if (!hasValidAdminSession(cookies)) {
		return unauthorizedJson();
	}
	try {
		const data = await readEtudeTopics();
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
	const parsed = etudeTopicsDataSchema.safeParse(body);
	if (!parsed.success) {
		return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	const topicIds = new Set(parsed.data.topics.map((t) => t.id));
	if (topicIds.size !== parsed.data.topics.length) {
		return new Response(JSON.stringify({ error: 'id тем должны быть уникальны' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	const etudeIds = new Set(parsed.data.etudes.map((e) => e.id));
	if (etudeIds.size !== parsed.data.etudes.length) {
		return new Response(JSON.stringify({ error: 'id этюдов должны быть уникальны' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}
	const unknownTopic = parsed.data.etudes.find((e) => !topicIds.has(e.topicId));
	if (unknownTopic) {
		return new Response(JSON.stringify({ error: `этюд ${unknownTopic.id} ссылается на неизвестную тему` }), {
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
		await writeEtudeTopics(parsed.data);
		const afterRaw = await readFile(TARGET_PATH, 'utf8');
		await logAdminContentChange({
			entity: 'etude-topics',
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
