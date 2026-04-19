import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'kit20_admin';

export function cookieName(): typeof COOKIE {
	return COOKIE;
}

export function getSessionSecret(): string {
	const s = import.meta.env.ADMIN_SESSION_SECRET ?? import.meta.env.ADMIN_PASSWORD;
	return typeof s === 'string' && s.length > 0 ? s : '';
}

export function createSessionToken(secret: string, ttlSec = 60 * 60 * 24 * 14): string {
	const exp = Math.floor(Date.now() / 1000) + ttlSec;
	const payload = Buffer.from(JSON.stringify({ exp }), 'utf8').toString('base64url');
	const sig = createHmac('sha256', secret).update(payload).digest('base64url');
	return `${payload}.${sig}`;
}

export function verifySessionToken(token: string, secret: string): boolean {
	if (!token || !secret) return false;
	const dot = token.lastIndexOf('.');
	if (dot <= 0) return false;
	const payload = token.slice(0, dot);
	const sig = token.slice(dot + 1);
	const expected = createHmac('sha256', secret).update(payload).digest('base64url');
	if (sig.length !== expected.length) return false;
	try {
		if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
	} catch {
		return false;
	}
	let exp = 0;
	try {
		const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
		exp = typeof parsed.exp === 'number' ? parsed.exp : 0;
	} catch {
		return false;
	}
	return exp > Math.floor(Date.now() / 1000);
}

export function isAuthed(cookieValue: string | undefined): boolean {
	const secret = getSessionSecret();
	if (!secret) return false;
	if (!cookieValue) return false;
	return verifySessionToken(cookieValue, secret);
}
