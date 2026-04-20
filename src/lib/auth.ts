import { createHmac, timingSafeEqual } from 'node:crypto';

// Bump cookie name to invalidate stale long-lived sessions.
const COOKIE = 'kit20_admin_v2';

export function cookieName(): typeof COOKIE {
	return COOKIE;
}

/** Пароль и секрет сессии читаются в рантайме (process.env), иначе после build они пустые. По умолчанию — kit20. */
const DEFAULT_ADMIN_PASSWORD = 'kit20';

function pickEnv(...candidates: (string | undefined)[]): string {
	for (const c of candidates) {
		if (typeof c === 'string' && c.trim().length > 0) return c;
	}
	return DEFAULT_ADMIN_PASSWORD;
}

export function getAdminPassword(): string {
	return pickEnv(process.env.ADMIN_PASSWORD, import.meta.env.ADMIN_PASSWORD);
}

export function getSessionSecret(): string {
	return pickEnv(
		process.env.ADMIN_SESSION_SECRET,
		import.meta.env.ADMIN_SESSION_SECRET,
		process.env.ADMIN_PASSWORD,
		import.meta.env.ADMIN_PASSWORD
	);
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
