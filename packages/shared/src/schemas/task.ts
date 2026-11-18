import { z } from 'zod';
import { LIMITS, TASK_PRIORITIES, TASK_STATUSES } from '../constants.js';
import { TASK_KEY_PATTERN } from '../task-key.js';
import { booleanParam, idSchema, isoDateSchema, listParam, paginationQuerySchema } from './common.js';

export const taskStatusSchema = z.enum(TASK_STATUSES, 'Neplatný stav úkolu');
export const taskPrioritySchema = z.enum(TASK_PRIORITIES, 'Neplatná priorita');

const taskTitle = z
  .string('Název úkolu je povinný')
  .trim()
  .min(1, 'Název úkolu je povinný')
  .max(LIMITS.taskTitleMax, `Název může mít nejvýše ${LIMITS.taskTitleMax} znaků`);

const taskDescription = z
  .string()
  .trim()
  .max(LIMITS.taskDescriptionMax, `Popis může mít nejvýše ${LIMITS.taskDescriptionMax} znaků`);

const labelIds = z
  .array(idSchema)
  .max(LIMITS.labelsPerTask, `Úkol může mít nejvýše ${LIMITS.labelsPerTask} štítků`)
  .refine((ids) => new Set(ids).size === ids.length, 'Štítky se nesmí opakovat');

export const createTaskSchema = z.object({
  title: taskTitle,
  description: taskDescription.optional(),
  status: taskStatusSchema.default('TODO'),
  priority: taskPrioritySchema.default('MEDIUM'),
  assigneeId: idSchema.nullable().optional(),
  dueDate: isoDateSchema.nullable().optional(),
  labelIds: labelIds.default([]),
});
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: taskTitle,
    description: taskDescription.nullable(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    assigneeId: idSchema.nullable(),
    dueDate: isoDateSchema.nullable(),
    labelIds,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nebyla zadána žádná změna');
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/**
 * Přesun úkolu na Kanbanu. Klient posílá cílový sloupec a sousedy v cílovém
 * pořadí; server z nich spočítá novou pozici. Díky tomu přesun funguje
 * i ve filtrovaném pohledu, kde klient nevidí všechny úkoly sloupce.
 */
export const moveTaskSchema = z.object({
  status: taskStatusSchema,
  prevId: idSchema.nullable().optional(),
  nextId: idSchema.nullable().optional(),
});
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;

export const TASK_SORT_FIELDS = ['number', 'title', 'status', 'priority', 'dueDate', 'createdAt', 'updatedAt'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

const assigneeFilter = z.union([z.literal('me'), z.literal('none'), idSchema]);

export const taskFilterSchema = z.object({
  projectId: idSchema.optional(),
  status: listParam(taskStatusSchema),
  priority: listParam(taskPrioritySchema),
  assigneeId: assigneeFilter.optional(),
  labelId: idSchema.optional(),
  q: z.string().trim().max(200).optional(),
  overdue: booleanParam,
});
export type TaskFilter = z.infer<typeof taskFilterSchema>;

export const taskListQuerySchema = taskFilterSchema.extend(paginationQuerySchema.shape).extend({
  sort: z.enum(TASK_SORT_FIELDS).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export const boardQuerySchema = taskFilterSchema.omit({ projectId: true, status: true });
export type BoardQuery = z.infer<typeof boardQuerySchema>;

/** Úkol lze adresovat UUID nebo lidsky čitelným klíčem (TF-104). */
export const taskRefSchema = z
  .string()
  .refine(
    (v) => idSchema.safeParse(v).success || TASK_KEY_PATTERN.test(v.toUpperCase()),
    'Neplatný identifikátor úkolu',
  );

export const taskParamsSchema = z.object({ taskId: taskRefSchema });
export const projectTaskParamsSchema = z.object({ projectId: idSchema });
