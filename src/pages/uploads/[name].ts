import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

export const prerender = false;

const MIME_BY_EXT: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
};

export const GET: APIRoute = async ({ params }) => {
	const rawName = typeof params.name === 'string' ? params.name : '';
	if (!/^[a-zA-Z0-9._-]+$/.test(rawName)) {
		return new Response('Not found', { status: 404 });
	}

	const ext = extname(rawName).toLowerCase();
	const contentType = MIME_BY_EXT[ext];
	if (!contentType) {
		return new Response('Not found', { status: 404 });
	}

	const roots = [
		join(process.cwd(), 'storage', 'uploads'),
		join(process.cwd(), 'public', 'uploads'),
		join(process.cwd(), 'dist', 'client', 'uploads'),
	];

	for (const root of roots) {
		try {
			const data = await readFile(join(root, rawName));
			return new Response(data, {
				status: 200,
				headers: {
					'Content-Type': contentType,
					'Cache-Control': 'public, max-age=31536000, immutable',
				},
			});
		} catch {
			// пробуем следующую директорию
		}
	}

	return new Response('Not found', { status: 404 });
};
