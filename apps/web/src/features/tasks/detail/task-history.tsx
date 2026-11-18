import { History } from 'lucide-react';

import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityList } from '@/features/activity/activity-list';
import { useTaskHistory } from '@/features/tasks/api';

export function TaskHistory({ taskRef }: { taskRef: string }) {
  const history = useTaskHistory(taskRef);
  if (history.isPending) return <Skeleton className="h-32" />;
  if (history.isError) return <ErrorState error={history.error} onRetry={() => void history.refetch()} />;
  const items = history.data.pages.flatMap((p) => p.items);
  if (items.length === 0) return <EmptyState compact icon={History} title="Žádné změny" />;
  return (
    <div>
      <ActivityList items={items} context="task" />
      {history.hasNextPage ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          loading={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          Načíst starší
        </Button>
      ) : null}
    </div>
  );
}
