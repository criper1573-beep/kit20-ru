import type { APIRoute } from 'astro';
import { createSessionToken, cookieName, getSessionSecret } from '../../../lib/auth';

export const prerender = false;

function safeNext(raw: string | null): string {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/admin';
	return raw;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const sessionSecret = getSessionSecret();
	const envPassword = import.meta.env.ADMIN_PASSWORD ?? '';
	if (!sessionSecret || !envPassword) {
		return new Response(
			JSON.stringify({ error: 'Сервер не настроен: задайте ADMIN_PASSWORD в окружении' }),
			{ status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
		);
	}

	let password = '';
	let next = '/admin';
	const ct = request.headers.get('content-type') ?? '';
	if (ct.includes('application/json')) {
		const j = (await request.json().catch(() => null)) as { password?: string; next?: string } | null;
		password = typeof j?.password === 'string' ? j.password : '';
		next = safeNext(typeof j?.next === 'string' ? j.next : null);
	} else {
		const fd = await request.formData().catch(() => null);
		password = String(fd?.get('password') ?? '');
		next = safeNext(typeof fd?.get('next') === 'string' ? String(fd.get('next')) : null);
	}

	if (password !== envPassword) {
		return new Response(JSON.stringify({ error: 'Неверный пароль' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	const token = createSessionToken(sessionSecret);
	cookies.set(cookieName(), token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: 60 * 60 * 24 * 14,
	});

	if (ct.includes('application/json')) {
		return new Response(JSON.stringify({ ok: true, next }), {
			status: 200,
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
		});
	}

	return redirect(next, 302);
};
