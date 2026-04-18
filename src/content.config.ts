import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const etudeSchema = z.object({
	title: z.string(),
	passed: z.boolean(),
	date: z.string().optional(),
});

const attendanceStatus = z.enum(['present', 'absent', 'excused']);

const attendanceRecordSchema = z.object({
	student: z.string(),
	status: attendanceStatus,
});

const lessonSchema = z.object({
	date: z.string(),
	label: z.string().optional(),
	records: z.array(attendanceRecordSchema).default([]),
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
