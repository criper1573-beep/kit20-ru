export type AttendanceCellState = 'present' | 'absent';

export type AttendanceLessonLike = {
	records?: { student: string; status?: string }[];
	exceptions?: { student: string; status?: string }[];
};

/** Статус ячейки: «был» / «не был» (excused считается как был). */
export function attendanceCellStatus(lesson: AttendanceLessonLike, slug: string): AttendanceCellState {
	const legacy = lesson.records;
	if (legacy && legacy.length > 0) {
		const r = legacy.find((x) => x.student === slug);
		if (r?.status === 'absent') return 'absent';
		return 'present';
	}
	const ex = lesson.exceptions?.find((x) => x.student === slug);
	if (!ex) return 'present';
	if (ex.status === 'excused') return 'present';
	return 'absent';
}

export function attendancePresentCount(lessons: AttendanceLessonLike[], slug: string): number {
	return lessons.filter((l) => attendanceCellStatus(l, slug) === 'present').length;
}
