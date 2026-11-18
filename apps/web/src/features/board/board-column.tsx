import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TASK_STATUS_LABELS, type Task, type TaskStatus } from '@teamflow/shared';
import { Plus } from 'lucide-react';
import { StatusIcon } from '@/components/domain';
import { STATUS_CSS_VAR } from '@/components/domain-tokens';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SortableTaskCard } from './task-card';

interface Props {
  status: TaskStatus;
  taskIds: string[];
  tasksById: Map<string, Task>;
  canDrag: boolean;
  onCreate?: (() => void) | undefined;
  onOpenTask: (key: string) => void;
  isDropTarget: boolean;
}

export function BoardColumn({ status, taskIds, tasksById, canDrag, onCreate, onOpenTask, isDropTarget }: Props) {
  const { setNodeRef } = useDroppable({ id: status, data: { type: 'column' } });

  return (
    <section
      aria-label={`Sloupec ${TASK_STATUS_LABELS[status]}`}
      className="flex w-[290px] shrink-0 flex-col sm:w-[300px]"
      data-testid={`column-${status}`}
    >
      <header className="mb-2.5 flex items-center gap-2 px-1">
        <StatusIcon status={status} />
        <h2 className="text-[13.5px] font-bold">{TASK_STATUS_LABELS[status]}</h2>
        <span
          className="rounded-full bg-muted px-1.5 text-[11.5px] font-bold text-muted-foreground tabular"
          data-testid="column-count"
        >
          {taskIds.length}
        </span>
        {onCreate ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto"
            aria-label={`Nový úkol ve sloupci ${TASK_STATUS_LABELS[status]}`}
            onClick={onCreate}
          >
            <Plus className="size-3.5" />
          </Button>
        ) : null}
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-40 flex-1 flex-col rounded-xl border border-transparent p-1.5 transition-colors',
          isDropTarget ? 'border-dashed bg-primary-soft/40' : 'bg-muted/45',
        )}
        style={{ boxShadow: `inset 0 2px 0 0 color-mix(in oklch, ${STATUS_CSS_VAR[status]} 55%, transparent)` }}
      >
        <SortableContext id={status} items={taskIds} strategy={verticalListSortingStrategy}>
          <ul className="grid gap-2">
            {taskIds.map((id) => {
              const task = tasksById.get(id);
              if (!task) return null;
              return <SortableTaskCard key={id} task={task} disabled={!canDrag} onOpen={() => onOpenTask(task.key)} />;
            })}
          </ul>
        </SortableContext>
        {taskIds.length === 0 ? (
          <div className="grid flex-1 place-items-center rounded-lg border border-dashed border-border-strong/70 px-4 py-8 text-center text-[12.5px] text-subtle-foreground">
            {canDrag ? 'Přetáhněte sem úkol' : 'Žádné úkoly'}
          </div>
        ) : null}
      </div>
    </section>
  );
}
