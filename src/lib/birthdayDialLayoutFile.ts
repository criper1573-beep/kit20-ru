import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/** Сохранённое положение подписи на циферблате (координаты viewBox, rot — градусы для SVG rotate) */
export type BirthdayLabelOverride = { x: number; y: number; rot: number };

function layoutPath(): string {
	return join(process.cwd(), 'storage', 'birthday-dial-labels.json');
}

export async function readBirthdayDialLayoutFile(): Promise<Record<string, BirthdayLabelOverride>> {
	try {
		const raw = await readFile(layoutPath(), 'utf8');
		const j = JSON.parse(raw) as unknown;
		if (j == null || typeof j !== 'object' || Array.isArray(j)) return {};
		const o: Record<string, BirthdayLabelOverride> = {};
		for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
			if (typeof v !== 'object' || v == null) continue;
			const t = v as { x?: unknown; y?: unknown; rot?: unknown };
			if (
				typeof t.x === 'number' &&
				Number.isFinite(t.x) &&
				typeof t.y === 'number' &&
				Number.isFinite(t.y) &&
				typeof t.rot === 'number' &&
				Number.isFinite(t.rot)
			) {
				o[k] = { x: t.x, y: t.y, rot: t.rot };
			}
		}
		return o;
	} catch (e) {
		const c = (e as NodeJS.ErrnoException).code;
		if (c === 'ENOENT') return {};
		throw e;
	}
}

export async function writeBirthdayDialLayoutFile(
	data: Record<string, BirthdayLabelOverride>,
): Promise<void> {
	await mkdir(join(process.cwd(), 'storage'), { recursive: true });
	await writeFile(layoutPath(), JSON.stringify(data, null, '\t') + '\n', 'utf8');
}
