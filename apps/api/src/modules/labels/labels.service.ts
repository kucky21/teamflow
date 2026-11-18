import type { CreateLabelInput, Label, UpdateLabelInput } from '@teamflow/shared';
import { conflict, isUniqueViolation, notFound } from '../../lib/errors.js';
import type { Db } from '../../lib/prisma.js';
import type { AccessService } from '../access/access.service.js';
import type { ActivityService } from '../activity/activity.service.js';
import { toLabel } from '../mappers.js';

const duplicate = (name: string) => conflict(`Štítek „${name}“ už v projektu existuje.`, 'LABEL_EXISTS');

export class LabelService {
  constructor(
    private readonly db: Db,
    private readonly access: AccessService,
    private readonly activity: ActivityService,
  ) {}

  async list(projectId: string, userId: string): Promise<Label[]> {
    await this.access.project(projectId, userId, 'project:view', { allowArchived: true });
    const labels = await this.db.label.findMany({ where: { projectId }, orderBy: { name: 'asc' } });
    return labels.map(toLabel);
  }

  async create(projectId: string, userId: string, input: CreateLabelInput): Promise<Label> {
    try {
      return await this.db.$transaction(async (tx) => {
        await this.access.project(projectId, userId, 'label:manage', { db: tx });
        const label = await tx.label.create({ data: { projectId, name: input.name, color: input.color } });
        await this.activity.record(tx, {
          type: 'LABEL_CREATED',
          projectId,
          actorId: userId,
          meta: { labelName: label.name },
        });
        return toLabel(label);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicate(input.name);
      throw error;
    }
  }

  async update(projectId: string, labelId: string, userId: string, input: UpdateLabelInput): Promise<Label> {
    try {
      return await this.db.$transaction(async (tx) => {
        await this.access.project(projectId, userId, 'label:manage', { db: tx });
        const existing = await tx.label.findFirst({ where: { id: labelId, projectId } });
        if (!existing) throw notFound('Štítek neexistuje.');
        const label = await tx.label.update({
          where: { id: labelId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.color !== undefined ? { color: input.color } : {}),
          },
        });
        await this.activity.record(tx, {
          type: 'LABEL_UPDATED',
          projectId,
          actorId: userId,
          changes: existing.name !== label.name ? [{ field: 'name', from: existing.name, to: label.name }] : [],
          meta: { labelName: label.name },
        });
        return toLabel(label);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw duplicate(input.name ?? '');
      throw error;
    }
  }

  async remove(projectId: string, labelId: string, userId: string): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await this.access.project(projectId, userId, 'label:manage', { db: tx });
      const existing = await tx.label.findFirst({ where: { id: labelId, projectId } });
      if (!existing) throw notFound('Štítek neexistuje.');
      // Vazby na úkoly (task_labels) se odstraní kaskádově.
      await tx.label.delete({ where: { id: labelId } });
      await this.activity.record(tx, {
        type: 'LABEL_DELETED',
        projectId,
        actorId: userId,
        meta: { labelName: existing.name },
      });
    });
  }
}
