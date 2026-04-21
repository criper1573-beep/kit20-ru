import { z } from 'astro:content';

export const etudeSchema = z.object({
	title: z.string(),
	passed: z.boolean(),
	date: z.string().optional(),
	teacherComment: z.string().optional(),
});

export const attendanceStatus = z.enum(['present', 'absent', 'excused']);

/** Устаревший формат: полный список учеников на занятие */
export const attendanceRecordSchema = z.object({
	student: z.string(),
	status: attendanceStatus,
});

/**
 * Список отсутствующих: только `student` (остальные = «был»).
 * Допускается устаревшее поле `status` при чтении (игнорируется, кроме excused → не в списке отсутствующих).
 */
export const attendanceExceptionSchema = z.object({
	student: z.string(),
	status: z.enum(['absent', 'excused']).optional(),
});

/** YAML без кавычек даёт timestamp → Date; нормализуем в YYYY-MM-DD */
const yamlDateToString = z.preprocess((val) => {
	if (val instanceof Date) return val.toISOString().slice(0, 10);
	return val;
}, z.string());

export const lessonSchema = z.object({
	date: yamlDateToString,
	label: z.string().optional(),
	exceptions: z.array(attendanceExceptionSchema).optional().default([]),
	records: z.array(attendanceRecordSchema).optional(),
});

export const homeProgressColorSchema = z.enum(['ink', 'accent', 'muted', 'mono']);

export const homeSemesterBarSchema = z.object({
	label: z.string(),
	progress: z.number().min(0).max(100),
	/** Цвет заливки полосы: ink — чёрный, accent — красный, muted — серый, mono — тёмно-серый */
	color: homeProgressColorSchema.optional().default('ink'),
});

export const homeTitleFontSchema = z.enum(['display', 'sans', 'serif']);
export const homeTypographyWeightSchema = z.enum(['normal', 'bold']);

export const homeFrontmatterSchema = z.object({
	title: z.string(),
	subtitle: z.string().optional(),
	photo: z.string().optional(),
	/** Тексты бегущих строк (верх / низ). Пусто — подставятся значения по умолчанию из макета. */
	tickerTop: z.string().optional(),
	tickerBottom: z.string().optional(),
	/** Типографика заголовка главной */
	titleFont: homeTitleFontSchema.optional().default('display'),
	titleWeight: homeTypographyWeightSchema.optional().default('normal'),
	titleItalic: z.boolean().optional().default(false),
	/** Типографика подзаголовка */
	subtitleFont: homeTitleFontSchema.optional().default('sans'),
	subtitleWeight: homeTypographyWeightSchema.optional().default('normal'),
	subtitleItalic: z.boolean().optional().default(false),
	/** Прогресс по семестрам (до 2 учебных лет); см. бренд-бук «Прогресс» */
	semesters: z.array(homeSemesterBarSchema).optional(),
});

export const studentFrontmatterSchema = z.object({
	slug: z.string(),
	displayName: z.string(),
	fullName: z.string(),
	birthday: z.string().optional(),
	nickname: z.string().optional(),
	phone: z.string().optional(),
	photo: z.string().optional(),
	order: z.number(),
	etudes: z.array(etudeSchema).default([]),
});

export const attendanceFrontmatterSchema = z.object({
	lessons: z.array(lessonSchema).default([]),
});

export type HomeFrontmatter = z.infer<typeof homeFrontmatterSchema>;
export type StudentFrontmatter = z.infer<typeof studentFrontmatterSchema>;
export type AttendanceFrontmatter = z.infer<typeof attendanceFrontmatterSchema>;
