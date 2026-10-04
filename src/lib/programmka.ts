/** Хелперы отображения для дизайна «Программка». Только форматирование — данные и математика не меняются. */
import type { ClassEtude, EtudeTopic, StudentFrontmatter } from './schemas';
import { attendanceCellStatus, type AttendanceLessonLike } from './attendanceStats';

export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** Копейки → «1 171,19» / «6 900» / «−971,12» (без знака ₽). */
export function fmtRub(kopeks: number): string {
	const neg = kopeks < 0;
	const abs = Math.abs(Math.round(kopeks));
	const rub = Math.floor(abs / 100);
	const kop = abs % 100;
	const int = String(rub).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
	const s = kop ? `${int},${String(kop).padStart(2, '0')}` : int;
	return (neg ? '−' : '') + s;
}

export function plural(n: number, one: string, few: string, many: string): string {
	const k = n % 10;
	const h = n % 100;
	if (k === 1 && h !== 11) return one;
	if (k >= 2 && k <= 4 && (h < 12 || h > 14)) return few;
	return many;
}

const NUM_WORDS = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать', 'двадцать'];
export function numWord(n: number): string {
	return NUM_WORDS[n] ?? String(n);
}

/** «12.06.2001» → { d: 12, m: 6 } (год отбрасываем: на публичных страницах его не показываем, 152-ФЗ). */
export function dayMonth(birthday: string | undefined): { d: number; m: number } | null {
	if (!birthday) return null;
	const p = birthday.trim().split('.');
	if (p.length < 2) return null;
	const d = parseInt(p[0]!, 10);
	const m = parseInt(p[1]!, 10);
	if (!(d >= 1 && d <= 31 && m >= 1 && m <= 12)) return null;
	return { d, m };
}

export function dayMonthText(birthday: string | undefined): string | null {
	const dm = dayMonth(birthday);
	return dm ? `${dm.d} ${MONTHS_GEN[dm.m - 1]}` : null;
}

/** Слова бегущей строки из home.md (через «*»). */
export function tickerWords(raw: string | undefined): string[] {
	return (raw ?? '')
		.split('*')
		.map((w) => w.trim())
		.filter(Boolean);
}

/** «2026-09-26» → «26.09». */
export function shortDate(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
	return m ? `${m[3]}.${m[2]}` : iso;
}

export function sortLessonsNewest<T extends { date: string }>(lessons: T[]): T[] {
	return [...lessons].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function attendanceSummary(lessons: AttendanceLessonLike[], slugs: string[]) {
	let present = 0;
	for (const l of lessons) for (const s of slugs) if (attendanceCellStatus(l, s) === 'present') present += 1;
	const slots = lessons.length * slugs.length;
	return { present, slots, pct: slots ? Math.round((present * 100) / slots) : 0 };
}

export type CastRole = { topic: string; title: string; partners: string[]; note: string };

/**
 * Роли исполнителя: этюды из etude-topics.json (тема, название, партнёры) + этюды из карточки ученика,
 * которых нет в темах. Заметка педагога — teacherComment этюда в карточке ученика (по названию), иначе из темы.
 */
export function castRoles(
	slug: string,
	student: StudentFrontmatter,
	topics: EtudeTopic[],
	etudes: ClassEtude[],
	nameOf: (slug: string) => string,
): CastRole[] {
	const topicTitle = new Map(topics.map((t) => [t.id, t.title]));
	const order = new Map(topics.map((t, i) => [t.id, i]));
	const notes = new Map<string, string>();
	for (const e of student.etudes ?? []) {
		if (e.title?.trim()) notes.set(e.title.trim().toLowerCase(), (e.teacherComment ?? '').trim());
	}
	const out: CastRole[] = [];
	const seen = new Set<string>();
	const mine = etudes
		.filter((e) => e.participantSlugs.includes(slug))
		.sort((a, b) => (order.get(a.topicId) ?? 99) - (order.get(b.topicId) ?? 99));
	for (const e of mine) {
		const title = (e.title ?? '').trim();
		const key = title.toLowerCase();
		if (title) seen.add(key);
		const tc = (e.teacherComment ?? '').trim();
		out.push({
			topic: topicTitle.get(e.topicId) ?? e.topicId,
			title,
			partners: e.participantSlugs.filter((p) => p !== slug).map(nameOf),
			note: (title && notes.get(key)) || (tc && tc !== 'Сдан' ? tc : ''),
		});
	}
	for (const e of student.etudes ?? []) {
		const title = (e.title ?? '').trim();
		if (!title || seen.has(title.toLowerCase())) continue;
		seen.add(title.toLowerCase());
		out.push({ topic: 'Этюд', title, partners: [], note: (e.teacherComment ?? '').trim() });
	}
	return out;
}

/** Типографика заметок педагога: пробел после точки/запятой перед буквой. Смысл не меняется. */
export function tidy(t: string): string {
	return t
		.replace(/([.,])(?=[А-ЯЁа-яё])/g, '$1 ')
		.replace(/\s+,/g, ',')
		.replace(/\s{2,}/g, ' ')
		.trim();
}
