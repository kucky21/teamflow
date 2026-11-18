import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from '@teamflow/shared';

import { PriorityIcon } from '@/components/domain/priority';
import { StatusIcon } from '@/components/domain/status';
import type { SelectOption } from '@/components/ui/select';

export const STATUS_OPTIONS: SelectOption<TaskStatus>[] = TASK_STATUSES.map((s) => ({
  value: s,
  label: TASK_STATUS_LABELS[s],
  icon: <StatusIcon status={s} />,
}));

export const PRIORITY_OPTIONS: SelectOption<TaskPriority>[] = [...TASK_PRIORITIES].reverse().map((p) => ({
  value: p,
  label: TASK_PRIORITY_LABELS[p],
  icon: <PriorityIcon priority={p} />,
}));
