import type { APIRoute } from 'astro';
import { cookieName, getSessionSecret, verifySessionToken } from '../../../lib/auth';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const POST: APIRoute = async (ctx) => {
	const secret = getSessionSecret();
	const token = ctx.cookies.get(cookieName())?.value;
	const valid = Boolean(secret && token && verifySessionToken(token, secret));
	if (!valid) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const formData = await ctx.request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return new Response(JSON.stringify({ error: 'No file provided' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		if (!file.type.startsWith('image/')) {
			return new Response(JSON.stringify({ error: 'Разрешены только изображения' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const ext = (extname(file.name) || '.jpg').toLowerCase();
		const filename = `${randomUUID()}${ext}`;

		// Папка вне dist/client, чтобы файлы не терялись при пересборке.
		const uploadDir = join(process.cwd(), 'storage', 'uploads');
		await mkdir(uploadDir, { recursive: true });

		const filePath = join(uploadDir, filename);
		await writeFile(filePath, buffer);

		return new Response(JSON.stringify({ url: `/uploads/${filename}` }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (e) {
		console.error('Upload error:', e);
		return new Response(JSON.stringify({ error: 'Upload failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
