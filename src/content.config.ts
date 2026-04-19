import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const etudeSchema = z.object({
	title: z.string(),
	passed: z.boolean(),
	date: z.string().optional(),
});

const attendanceStatus = z.enum(['present', 'absent', 'excused']);

/** Устаревший формат: полный список учеников на занятие */
const attendanceRecordSchema = z.object({
	student: z.string(),
	status: attendanceStatus,
});

/**
 * Список отсутствующих: только `student` (остальные = «был»).
 * Допускается устаревшее поле `status` при чтении (игнорируется, кроме excused → не в списке отсутствующих).
 */
const attendanceExceptionSchema = z.object({
	student: z.string(),
	status: z.enum(['absent', 'excused']).optional(),
});

/** YAML без кавычек даёт timestamp → Date; нормализуем в YYYY-MM-DD */
const yamlDateToString = z.preprocess((val) => {
	if (val instanceof Date) return val.toISOString().slice(0, 10);
	return val;
}, z.string());

const lessonSchema = z.object({
	date: yamlDateToString,
	label: z.string().optional(),
	exceptions: z.array(attendanceExceptionSchema).optional().default([]),
	records: z.array(attendanceRecordSchema).optional(),
});

export const collections = {
	home: defineCollection({
		loader: glob({ pattern: 'home.md', base: './src/content' }),
		schema: z.object({
			title: z.string(),
			subtitle: z.string().optional(),
		}),
	}),
	students: defineCollection({
		loader: glob({ pattern: '*.md', base: './src/content/students' }),
		schema: z.object({
			slug: z.string(),
			displayName: z.string(),
			fullName: z.string(),
			birthday: z.string().optional(),
			nickname: z.string().optional(),
			phone: z.string().optional(),
			photo: z.string().optional(),
			order: z.number(),
			etudes: z.array(etudeSchema).default([]),
		}),
	}),
	attendance: defineCollection({
		loader: glob({ pattern: 'attendance.md', base: './src/content' }),
		schema: z.object({
			lessons: z.array(lessonSchema).default([]),
			demo: z.boolean().optional().default(false),
		}),
	}),
};
