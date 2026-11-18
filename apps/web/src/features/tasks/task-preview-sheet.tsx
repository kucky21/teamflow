import { Dialog, SheetContent } from '@/components/ui/dialog';
import { TaskDetail } from '@/features/tasks/detail/task-detail';

import { useTaskPreview } from './use-task-preview';

/** Rychlý náhled úkolu v postranním panelu (otevírá se z Kanbanu, seznamu i přehledu). */
export function TaskPreviewSheet() {
  const preview = useTaskPreview();
  const ref = preview.current;
  return (
    <Dialog open={Boolean(ref)} onOpenChange={(open) => !open && preview.close()}>
      {ref ? (
        <SheetContent title={`Úkol ${ref}`} aria-describedby={undefined}>
          <TaskDetail taskRef={ref} variant="sheet" onClose={preview.close} />
        </SheetContent>
      ) : null}
    </Dialog>
  );
}
