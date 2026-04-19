import { defineMiddleware } from 'astro:middleware';
import { cookieName, getSessionSecret, verifySessionToken } from './lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
	const path = context.url.pathname;

	const isProtectedAdmin =
		(path.startsWith('/admin') && path !== '/admin/login' && !path.startsWith('/admin/login/')) ||
		(path.startsWith('/api/admin') && path !== '/api/admin/login');

	if (!isProtectedAdmin) {
		return next();
	}

	const secret = getSessionSecret();
	const token = context.cookies.get(cookieName())?.value;
	const ok = Boolean(secret && token && verifySessionToken(token, secret));

	if (!ok) {
		if (path.startsWith('/api/')) {
			return new Response(JSON.stringify({ error: 'Нужна авторизация' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json; charset=utf-8' },
			});
		}
		const nextUrl = path + context.url.search;
		const login = new URL('/admin/login', context.url);
		login.searchParams.set('next', nextUrl || '/admin');
		return Response.redirect(login, 302);
	}

	return next();
});
