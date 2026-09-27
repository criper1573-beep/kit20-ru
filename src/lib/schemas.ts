import { z } from 'astro:content';

export const etudeSchema = z.object({
	title: z.string(),
	passed: z.boolean(),
	date: z.string().optional(),
	teacherComment: z.string().optional(),
});

/** Тема этюдов на /class (новые слева по createdAt). */
export const etudeTopicSchema = z.object({
	id: z.string().min(1),
	title: z.string().min(1),
	createdAt: z.string().min(1),
});

/** Строка этюда в теме: несколько участников, комментарий педагога. */
export const classEtudeSchema = z.object({
	id: z.string().min(1),
	topicId: z.string().min(1),
	title: z.string().optional().default(''),
	teacherComment: z.string().optional().default(''),
	participantSlugs: z.array(z.string().min(1)).default([]),
});

export const etudeTopicsDataSchema = z.object({
	topics: z.array(etudeTopicSchema).default([]),
	etudes: z.array(classEtudeSchema).default([]),
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

export const obshchakExpenseSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	amountKopeks: z.number().int().positive(),
	createdAt: z.string().optional(),
});

export const obshchakDataSchema = z.object({
	/** «Смотрящий» — отдельно от сетки 4×4 */
	watcherSlug: z.string().default('nastya'),
	/** Сколько внёс в кассу, коп. Ключ = slug. */
	contributedKopeks: z.record(z.string(), z.number().int().min(0)).default({}),
	expenses: z.array(obshchakExpenseSchema).default([]),
});

export const spectacleSchema = z.object({
	id: z.string().min(1),
	title: z.string(),
	heroPhoto: z.string(),
	directorName: z.string(),
	directorRegalia: z.string(),
	directorPhoto: z.string(),
	gallery: z.array(z.string()).default([]),
	/** Меньше — выше на главной. */
	order: z.number(),
});

export const spectaclesDataSchema = z.object({
	spectacles: z.array(spectacleSchema).default([]),
});

export type HomeFrontmatter = z.infer<typeof homeFrontmatterSchema>;
export type StudentFrontmatter = z.infer<typeof studentFrontmatterSchema>;
export type AttendanceFrontmatter = z.infer<typeof attendanceFrontmatterSchema>;
export type ObshchakData = z.infer<typeof obshchakDataSchema>;
export type ObshchakExpense = z.infer<typeof obshchakExpenseSchema>;
export type EtudeTopic = z.infer<typeof etudeTopicSchema>;
export type ClassEtude = z.infer<typeof classEtudeSchema>;
export type EtudeTopicsData = z.infer<typeof etudeTopicsDataSchema>;
export type Spectacle = z.infer<typeof spectacleSchema>;
export type SpectaclesData = z.infer<typeof spectaclesDataSchema>;
