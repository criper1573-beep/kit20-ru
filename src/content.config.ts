import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
	attendanceFrontmatterSchema,
	homeFrontmatterSchema,
	studentFrontmatterSchema,
} from './lib/schemas';

export const collections = {
	home: defineCollection({
		loader: glob({ pattern: 'home.md', base: './src/content' }),
		schema: homeFrontmatterSchema,
	}),
	students: defineCollection({
		loader: glob({ pattern: '*.md', base: './src/content/students' }),
		schema: studentFrontmatterSchema,
	}),
	attendance: defineCollection({
		loader: glob({ pattern: 'attendance.md', base: './src/content' }),
		schema: attendanceFrontmatterSchema,
	}),
};
