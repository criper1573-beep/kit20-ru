import fs from 'node:fs/promises';
import path from 'node:path';
import {
	attendanceFrontmatterSchema,
	homeFrontmatterSchema,
	obshchakDataSchema,
	studentFrontmatterSchema,
	type AttendanceFrontmatter,
	type HomeFrontmatter,
	type ObshchakData,
	type StudentFrontmatter,
} from './schemas';
import { parseMarkdownFile, stringifyMarkdownFile } from './mdFile';

function contentRoot(): string {
	return path.join(process.cwd(), 'src', 'content');
}

function studentsDir(): string {
	return path.join(contentRoot(), 'students');
}

export async function readHome(): Promise<{ data: HomeFrontmatter; body: string }> {
	const p = path.join(contentRoot(), 'home.md');
	const raw = await fs.readFile(p, 'utf8');
	const { data, body } = parseMarkdownFile(raw);
	const parsed = homeFrontmatterSchema.safeParse(data);
	if (!parsed.success) {
		throw new Error(`home.md: ${parsed.error.message}`);
	}
	return { data: parsed.data, body };
}

export async function writeHome(data: HomeFrontmatter, body: string): Promise<void> {
	const p = path.join(contentRoot(), 'home.md');
	homeFrontmatterSchema.parse(data);
	const raw = stringifyMarkdownFile(data, body);
	await fs.writeFile(p, raw, 'utf8');
}

export async function listStudentSlugs(): Promise<string[]> {
	const dir = studentsDir();
	const names = await fs.readdir(dir);
	return names
		.filter((n) => n.endsWith('.md'))
		.map((n) => n.replace(/\.md$/i, ''))
		.sort((a, b) => a.localeCompare(b, 'ru'));
}

export async function readStudent(slug: string): Promise<{ data: StudentFrontmatter; body: string }> {
	const safe = slug.replace(/[^a-z0-9-]/gi, '');
	if (safe !== slug) {
		throw new Error('Некорректный slug');
	}
	const p = path.join(studentsDir(), `${slug}.md`);
	const raw = await fs.readFile(p, 'utf8');
	const { data, body } = parseMarkdownFile(raw);
	const parsed = studentFrontmatterSchema.safeParse(data);
	if (!parsed.success) {
		throw new Error(`${slug}.md: ${parsed.error.message}`);
	}
	if (parsed.data.slug !== slug) {
		throw new Error(`slug в файле (${parsed.data.slug}) не совпадает с именем файла`);
	}
	return { data: parsed.data, body };
}

export async function writeStudent(data: StudentFrontmatter, body: string): Promise<void> {
	const slug = data.slug;
	const safe = slug.replace(/[^a-z0-9-]/gi, '');
	if (safe !== slug) {
		throw new Error('Некорректный slug');
	}
	studentFrontmatterSchema.parse(data);
	const p = path.join(studentsDir(), `${slug}.md`);
	const raw = stringifyMarkdownFile(data, body);
	await fs.writeFile(p, raw, 'utf8');
}

export async function readStudentsSorted(): Promise<
	Array<{ slug: string; data: StudentFrontmatter; body: string }>
> {
	const slugs = await listStudentSlugs();
	const out: Array<{ slug: string; data: StudentFrontmatter; body: string }> = [];
	for (const slug of slugs) {
		const row = await readStudent(slug);
		out.push({ slug, data: row.data, body: row.body });
	}
	out.sort((a, b) => a.data.order - b.data.order);
	return out;
}

export async function readAttendance(): Promise<{ data: AttendanceFrontmatter; body: string }> {
	const p = path.join(contentRoot(), 'attendance.md');
	const raw = await fs.readFile(p, 'utf8');
	const { data, body } = parseMarkdownFile(raw);
	const parsed = attendanceFrontmatterSchema.safeParse(data);
	if (!parsed.success) {
		throw new Error(`attendance.md: ${parsed.error.message}`);
	}
	return { data: parsed.data, body };
}

export async function writeAttendance(data: AttendanceFrontmatter, body: string): Promise<void> {
	const p = path.join(contentRoot(), 'attendance.md');
	attendanceFrontmatterSchema.parse(data);
	const raw = stringifyMarkdownFile(data, body);
	await fs.writeFile(p, raw, 'utf8');
}

export async function readObshchak(): Promise<ObshchakData> {
	const p = path.join(contentRoot(), 'obshchak.json');
	let raw: string;
	try {
		raw = await fs.readFile(p, 'utf8');
	} catch (e) {
		const err = e as { code?: string };
		if (err?.code === 'ENOENT') {
			const empty = obshchakDataSchema.parse({ watcherSlug: 'nastya' });
			return await normalizeObshchakContribKeys(empty);
		}
		throw e;
	}
	const json = JSON.parse(raw) as unknown;
	const parsed = obshchakDataSchema.safeParse(json);
	if (!parsed.success) {
		throw new Error(`obshchak.json: ${parsed.error.message}`);
	}
	return await normalizeObshchakContribKeys(parsed.data);
}

/**
 * Собирает взносы только по slug'ам из `students/`: нули по умолчанию,
 * лишние ключи (старые карточки) отбрасываем — касса и сумма балансов не «размазываются».
 */
async function normalizeObshchakContribKeys(data: ObshchakData): Promise<ObshchakData> {
	const students = await readStudentsSorted();
	const contributed: Record<string, number> = {};
	for (const { slug } of students) {
		contributed[slug] = data.contributedKopeks[slug] ?? 0;
	}
	return { ...data, contributedKopeks: contributed };
}

export async function writeObshchak(data: ObshchakData): Promise<void> {
	const p = path.join(contentRoot(), 'obshchak.json');
	obshchakDataSchema.parse(data);
	const normalized = await normalizeObshchakContribKeys(data);
	const raw = `${JSON.stringify(normalized, null, 2)}\n`;
	await fs.writeFile(p, raw, 'utf8');
}
