import { cookieName, getSessionSecret, verifySessionToken } from './auth';

type CookieReader = {
	get: (name: string) => { value?: string } | undefined;
};

export function hasValidAdminSession(cookies: CookieReader): boolean {
	const secret = getSessionSecret();
	const token = cookies.get(cookieName())?.value;
	return Boolean(secret && token && verifySessionToken(token, secret));
}

export function unauthorizedJson(): Response {
	return new Response(JSON.stringify({ error: 'Unauthorized' }), {
		status: 401,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}
