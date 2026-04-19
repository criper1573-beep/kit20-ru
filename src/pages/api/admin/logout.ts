import type { APIRoute } from 'astro';
import { cookieName } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
	cookies.set(cookieName(), '', {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: import.meta.env.PROD,
		maxAge: 0,
	});
	return redirect('/admin/login', 302);
};
