import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type AdminChangeEntity = 'home' | 'attendance' | 'student';
export type AdminChangeKind = 'update' | 'rollback';

export interface AdminChangeEntry {
	id: string;
	createdAt: string;
	entity: AdminChangeEntity;
	kind: AdminChangeKind;
	slug?: string;
	targetPath: string;
	beforeSnapshot: string;
	afterSnapshot: string;
	sourceChangeId?: string;
}

const LOG_ROOT = path.join(process.cwd(), 'storage', 'admin-change-log');
const SNAPSHOT_DIR = path.join(LOG_ROOT, 'snapshots');
const INDEX_FILE = path.join(LOG_ROOT, 'entries.jsonl');

function toPosix(p: string): string {
	return p.replace(/\\/g, '/');
}

function ensureAllowedTargetPath(targetPath: string): string {
	const normalized = toPosix(targetPath).replace(/^\/+/, '');
	if (!normalized.startsWith('src/content/') || !normalized.endsWith('.md') || normalized.includes('..')) {
		throw new Error('Недопустимый путь файла для журнала изменений');
	}
	return normalized;
}

function resolveTargetAbsolutePath(targetPath: string): string {
	const normalized = ensureAllowedTargetPath(targetPath);
	return path.join(process.cwd(), ...normalized.split('/'));
}

function parseIdOrThrow(id: string): string {
	if (!/^[a-f0-9-]{36}$/i.test(id)) {
		throw new Error('Некорректный id изменения');
	}
	return id;
}

function snapshotName(id: string, phase: 'before' | 'after'): string {
	return `${id}-${phase}.md`;
}

async function ensureStorage(): Promise<void> {
	await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

async function readIndexEntries(): Promise<AdminChangeEntry[]> {
	let raw = '';
	try {
		raw = await fs.readFile(INDEX_FILE, 'utf8');
	} catch (e) {
		const code = (e as NodeJS.ErrnoException)?.code;
		if (code === 'ENOENT') return [];
		throw e;
	}

	const out: AdminChangeEntry[] = [];
	for (const line of raw.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		try {
			const parsed = JSON.parse(trimmed) as AdminChangeEntry;
			if (parsed?.id && parsed?.createdAt && parsed?.targetPath) {
				out.push(parsed);
			}
		} catch {
			// пропускаем битую строку, чтобы не ломать чтение лога
		}
	}
	return out;
}

export async function logAdminContentChange(input: {
	entity: AdminChangeEntity;
	targetPath: string;
	beforeContent: string;
	afterContent: string;
	slug?: string;
	kind?: AdminChangeKind;
	sourceChangeId?: string;
}): Promise<AdminChangeEntry | null> {
	const targetPath = ensureAllowedTargetPath(input.targetPath);
	if (input.beforeContent === input.afterContent) return null;

	await ensureStorage();
	const id = randomUUID();
	const entry: AdminChangeEntry = {
		id,
		createdAt: new Date().toISOString(),
		entity: input.entity,
		kind: input.kind ?? 'update',
		slug: input.slug,
		targetPath,
		beforeSnapshot: snapshotName(id, 'before'),
		afterSnapshot: snapshotName(id, 'after'),
		sourceChangeId: input.sourceChangeId,
	};

	await fs.writeFile(path.join(SNAPSHOT_DIR, entry.beforeSnapshot), input.beforeContent, 'utf8');
	await fs.writeFile(path.join(SNAPSHOT_DIR, entry.afterSnapshot), input.afterContent, 'utf8');
	await fs.appendFile(INDEX_FILE, `${JSON.stringify(entry)}\n`, 'utf8');

	return entry;
}

export async function listAdminChangeLog(limit = 100): Promise<AdminChangeEntry[]> {
	const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 100;
	const entries = await readIndexEntries();
	return entries.slice(-safeLimit).reverse();
}

export async function rollbackAdminChangeById(idInput: string): Promise<{
	rolledBack: AdminChangeEntry;
	rollbackEntry: AdminChangeEntry | null;
}> {
	const id = parseIdOrThrow(idInput);
	const entries = await readIndexEntries();
	const hit = entries.find((e) => e.id === id);
	if (!hit) {
		throw new Error('Изменение не найдено');
	}

	const targetAbsolute = resolveTargetAbsolutePath(hit.targetPath);
	const beforeSnapshotPath = path.join(SNAPSHOT_DIR, hit.beforeSnapshot);

	const [snapshotBefore, currentRaw] = await Promise.all([
		fs.readFile(beforeSnapshotPath, 'utf8'),
		fs.readFile(targetAbsolute, 'utf8'),
	]);

	await fs.writeFile(targetAbsolute, snapshotBefore, 'utf8');
	const rollbackEntry = await logAdminContentChange({
		entity: hit.entity,
		targetPath: hit.targetPath,
		beforeContent: currentRaw,
		afterContent: snapshotBefore,
		slug: hit.slug,
		kind: 'rollback',
		sourceChangeId: hit.id,
	});

	return { rolledBack: hit, rollbackEntry };
}
