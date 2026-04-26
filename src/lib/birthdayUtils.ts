/** Парсинг даты в формате ДД.ММ.ГГГГ из markdown учеников. */

export type BirthdayParts = { day: number; month: number; year: number };

export function parseBirthdayDmy(raw: string | undefined): BirthdayParts | null {
	if (raw == null || typeof raw !== 'string') return null;
	const t = raw.trim();
	const parts = t.split('.');
	if (parts.length !== 3) return null;
	const day = parseInt(parts[0]!, 10);
	const month = parseInt(parts[1]!, 10);
	const year = parseInt(parts[2]!, 10);
	if (![day, month, year].every((n) => Number.isFinite(n))) return null;
	if (month < 1 || month > 12 || day < 1 || day > 31) return null;
	const dt = new Date(year, month - 1, day);
	if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
	return { day, month, year };
}

export function isLeapYear(y: number): boolean {
	return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInYear(y: number): number {
	return isLeapYear(y) ? 366 : 365;
}

/** День года 1..daysInYear(y) */
export function dayOfYearInYear(d: Date): number {
	const y = d.getFullYear();
	const start = new Date(y, 0, 0);
	return Math.floor((d.getTime() - start.getTime()) / 86400_000);
}

function dateAtNoonLocal(y: number, m: number, d: number): Date {
	return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Ссылочный год, в котором (month, day) существует (для 29.02 — только високосный).
 */
function referenceYearForMonthDay(month: number, day: number): number {
	if (month === 2 && day === 29) {
		// ближайший високосный вперёд от 2000
		for (let y = 2000; y < 2400; y += 4) {
			if (isLeapYear(y)) return y;
		}
		return 2000;
	}
	for (const y of [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]) {
		const t = new Date(y, month - 1, day);
		if (t.getFullYear() === y && t.getMonth() === month - 1 && t.getDate() === day) return y;
	}
	return 2023;
}

/**
 * Порядковый номер дня в году для (month, day) в согласованной шкале циферблата.
 */
export function dayOfYearForBirthMonthDay(month: number, day: number): number {
	const y = referenceYearForMonthDay(month, day);
	const dt = dateAtNoonLocal(y, month, day);
	return dayOfYearInYear(dt);
}

export function getDaysInYearForBirthMonthDay(month: number, day: number): number {
	return daysInYear(referenceYearForMonthDay(month, day));
}

/**
 * Угол в градусах: 0° =верх (12:00), по часовой. Диапазон [0, 360).
 * Шкала: полный год, середина dayOfYear — серединка «сектора дня».
 */
export function dialAngleDegFromTop(dayOfYear: number, yearLength: number): number {
	if (yearLength < 1) return 0;
	const t = (dayOfYear - 0.5) / yearLength;
	const deg = t * 360;
	return ((deg % 360) + 360) % 360;
}

/** SVG/математика: 0° вправо, поворот от «верха» циферблата */
export function dialRotationSvgDeg(degFromTop: number): number {
	return -90 + degFromTop;
}

export function isBirthdayDay(parts: BirthdayParts, now: Date): boolean {
	return now.getMonth() + 1 === parts.month && now.getDate() === parts.day;
}

/** Календарный день рождения в году `y` (для 29.02 в невисокосный — 28.02). */
export function birthdayInYearNoon(y: number, m: number, d: number): Date {
	if (m === 2 && d === 29) {
		if (isLeapYear(y)) return new Date(y, 1, 29, 12, 0, 0, 0);
		return new Date(y, 1, 28, 12, 0, 0, 0);
	}
	return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/**
 * Следующий календарный день рождения (локальные даты), не раньше `from` (начало дня from).
 * Возвращает Date в полдень.
 */
function nextBirthdayDateFrom(parts: BirthdayParts, from: Date): Date {
	const fromY = from.getFullYear();
	for (const y of [fromY, fromY + 1]) {
		const cand = birthdayInYearNoon(y, parts.month, parts.day);
		if (cand >= startOfDay(from)) return cand;
	}
	return birthdayInYearNoon(fromY + 2, parts.month, parts.day);
}

function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * 0, если сегодня день рождения; иначе положительное число дней до ближайшего.
 */
export function daysUntilNextBirthday(parts: BirthdayParts, now: Date): number {
	if (isBirthdayDay(parts, now)) return 0;
	const next = nextBirthdayDateFrom(parts, now);
	const diff = startOfDay(next).getTime() - startOfDay(now).getTime();
	return Math.round(diff / 86400_000);
}

export type PublicBirthdayRow = { displayName: string; day: number; month: number };

/**
 * Список имён, у кого сегодня ДР, и минимальное число дней до ближайшего (среди не-сегодня).
 */
/** Порядковый день (1..daysInYear) для отображаемой даты в локальном году `y`. */
export function dayOfYearForDateInYear(y: number, m: number, d: number): number {
	return dayOfYearInYear(birthdayInYearNoon(y, m, d));
}

export function computeBirthdayHighlights(
	rows: { displayName: string; parts: BirthdayParts }[],
	now: Date
): { todayNames: string[]; daysUntilNext: number } {
	const todayNames: string[] = [];
	for (const r of rows) {
		if (isBirthdayDay(r.parts, now)) todayNames.push(r.displayName);
	}

	if (todayNames.length > 0) {
		return { todayNames, daysUntilNext: 0 };
	}

	let minD = Infinity;
	for (const r of rows) {
		const d = daysUntilNextBirthday(r.parts, now);
		if (d < minD) minD = d;
	}
	return { todayNames: [], daysUntilNext: minD === Infinity ? 0 : minD };
}

/**
 * Сегодняшние именинники, или кто празднует в ближайшую впереди дату (при нуле «сегодня»).
 * Все с минимальным `daysUntil` попадают в `names` — у них одна и та же календарная `eventDate`.
 */
export function getNextBirthdayEventInfo(
	rows: { displayName: string; parts: BirthdayParts }[],
	now: Date
): { daysUntil: number; names: string[]; eventDate: Date } | null {
	if (rows.length === 0) return null;

	const todayNames: string[] = [];
	for (const r of rows) {
		if (isBirthdayDay(r.parts, now)) todayNames.push(r.displayName);
	}
	todayNames.sort((a, b) => a.localeCompare(b, 'ru'));
	if (todayNames.length > 0) {
		return {
			daysUntil: 0,
			names: todayNames,
			eventDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0),
		};
	}

	let minD = Infinity;
	for (const r of rows) {
		const d = daysUntilNextBirthday(r.parts, now);
		if (d < minD) minD = d;
	}
	if (minD === Infinity) {
		return { daysUntil: 0, names: [], eventDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0) };
	}

	const nextNames: string[] = [];
	for (const r of rows) {
		if (daysUntilNextBirthday(r.parts, now) === minD) nextNames.push(r.displayName);
	}
	nextNames.sort((a, b) => a.localeCompare(b, 'ru'));
	const w = rows.find((r) => daysUntilNextBirthday(r.parts, now) === minD);
	if (!w) {
		return { daysUntil: minD, names: nextNames, eventDate: new Date(now) };
	}
	return {
		daysUntil: minD,
		names: nextNames,
		eventDate: nextBirthdayDateFrom(w.parts, now),
	};
}
