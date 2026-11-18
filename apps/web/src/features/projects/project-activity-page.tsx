import { History } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/states';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, Skeleton } from '@/components/ui/misc';
import { ActivityList } from '@/features/activity/activity-list';
import { useProjectActivity } from './api';
import { useProjectContext } from './project-context';

export function ProjectActivityPage() {
  const { project } = useProjectContext();
  const activity = useProjectActivity(project.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardHeader
          title="Auditní log"
          description="Kompletní historie změn v projektu – úkoly, členové, štítky i nastavení."
        />
        <div className="p-5">
          {activity.isPending ? (
            <div className="grid gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : activity.isError ? (
            <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
          ) : activity.data.pages[0]?.items.length === 0 ? (
            <EmptyState compact icon={History} title="Zatím žádná aktivita" />
          ) : (
            <>
              <ActivityList items={activity.data.pages.flatMap((p) => p.items)} context="project" />
              {activity.hasNextPage ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="secondary"
                    loading={activity.isFetchingNextPage}
                    onClick={() => void activity.fetchNextPage()}
                  >
                    Načíst starší záznamy
                  </Button>
                </div>
              ) : (
                <p className="mt-6 text-center text-[12.5px] text-subtle-foreground">Začátek historie projektu</p>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
