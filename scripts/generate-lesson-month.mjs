/**
 * Генерация занятий на месяц: по умолчанию понедельник, среда, суббота.
 * Миграция: старый формат records (все ученики) → exceptions (только Н и У).
 *
 * Usage:
 *   node scripts/generate-lesson-month.mjs 2026 4
 *   node scripts/generate-lesson-month.mjs 2026 4 --dry-run
 *   node scripts/generate-lesson-month.mjs --migrate-only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const attendancePath = path.join(root, 'src', 'content', 'attendance.md');

const DEFAULT_WEEKDAYS = [1, 3, 6]; // Mon, Wed, Sat (0 = Sun)

function parseAttendanceFile(text) {
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\s*$/);
	if (!m) throw new Error('attendance.md: expected YAML frontmatter between --- lines');
	const data = YAML.parse(m[1]);
	return { data, rawFront: m[1] };
}

function serializeAttendance(data) {
	const body = YAML.stringify(data, { indent: 2, lineWidth: 120 });
	return `---\n${body}---\n`;
}

/** Старый records → exceptions (только absent / excused) */
function migrateLesson(lesson) {
	if (lesson.date instanceof Date) {
		lesson.date = isoDate(lesson.date);
	}
	if (Array.isArray(lesson.records) && lesson.records.length > 0) {
		lesson.exceptions = lesson.records
			.filter((r) => r.status === 'absent' || r.status === 'excused')
			.map((r) => ({ student: r.student, status: r.status }));
		delete lesson.records;
	}
	if (!Array.isArray(lesson.exceptions)) lesson.exceptions = [];
	return lesson;
}

function isoDate(d) {
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const da = String(d.getDate()).padStart(2, '0');
	return `${y}-${mo}-${da}`;
}

/** @param {number} year @param {number} month 1-12 @param {number[]} weekdays */
function datesInMonthByWeekdays(year, month, weekdays) {
	const out = [];
	const last = new Date(year, month, 0).getDate();
	for (let day = 1; day <= last; day++) {
		const dt = new Date(year, month - 1, day);
		if (weekdays.includes(dt.getDay())) out.push(isoDate(dt));
	}
	return out;
}

function main() {
	const argv = process.argv.slice(2);
	const dry = argv.includes('--dry-run');
	const migrateOnly = argv.includes('--migrate-only');
	const pos = argv.filter((a) => !a.startsWith('-'));
	const year = migrateOnly ? null : Number(pos[0]);
	const month = migrateOnly ? null : Number(pos[1]);

	if (!migrateOnly && (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12)) {
		console.error(`Usage:
  node scripts/generate-lesson-month.mjs <year> <month>   # e.g. 2026 4 for April
  node scripts/generate-lesson-month.mjs 2026 4 --dry-run
  node scripts/generate-lesson-month.mjs --migrate-only`);
		process.exit(1);
	}

	const text = fs.readFileSync(attendancePath, 'utf8');
	const { data } = parseAttendanceFile(text);
	data.lessons = (data.lessons ?? []).map(migrateLesson);

	if (migrateOnly) {
		const out = serializeAttendance(data);
		if (dry) console.log(out);
		else fs.writeFileSync(attendancePath, out, 'utf8');
		console.log('Migrated: records → exceptions (only absent / excused).');
		process.exit(0);
	}

	const newDates = datesInMonthByWeekdays(year, month, DEFAULT_WEEKDAYS);
	const byDate = new Map(data.lessons.map((l) => [l.date, l]));
	for (const date of newDates) {
		if (!byDate.has(date)) {
			const lesson = { date, label: '', exceptions: [] };
			byDate.set(date, lesson);
		}
	}
	data.lessons = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

	const out = serializeAttendance(data);
	if (dry) {
		console.log(out);
	} else {
		fs.writeFileSync(attendancePath, out, 'utf8');
		console.log(`Updated ${attendancePath} (${data.lessons.length} lessons). Weekdays Mon/Wed/Sat for ${year}-${String(month).padStart(2, '0')}.`);
	}
}

main();
