import { hasProjectPermission, PROJECT_ROLE_LABELS, PROJECT_STATUS_LABELS } from '@teamflow/shared';
import { Pencil } from 'lucide-react';
import { useState } from 'react';

import { ProjectIcon } from '@/components/domain/project-icon';
import { UserAvatar } from '@/components/domain/user-avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { useProjectContext } from '@/features/projects/project-context';
import { ProjectFormDialog } from '@/features/projects/project-form-dialog';
import { formatDate } from '@/lib/format';

import { DangerZone } from './danger-zone';
import { LabelsCard } from './labels-card';
import { MembersCard } from './members-card';

export function ProjectSettingsPage() {
  const { project } = useProjectContext();
  const [editOpen, setEditOpen] = useState(false);
  const canEdit = !project.archivedAt && hasProjectPermission(project.myRole, 'project:update');

  return (
    <div className="mx-auto grid max-w-4xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <Card>
        <CardHeader
          title="Obecné"
          description="Základní informace o projektu."
          action={
            canEdit ? (
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Upravit
              </Button>
            ) : null
          }
        />
        <dl className="grid gap-4 p-5 text-[13.5px] sm:grid-cols-2">
          <div className="flex items-center gap-3 sm:col-span-2">
            <ProjectIcon icon={project.icon} color={project.color} size="lg" />
            <div>
              <dt className="sr-only">Název</dt>
              <dd className="text-base font-bold">{project.name}</dd>
              <dd className="font-mono text-[12.5px] text-muted-foreground">{project.key}</dd>
            </div>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Popis</dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {project.description || <span className="text-subtle-foreground">Bez popisu</span>}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Stav</dt>
            <dd className="mt-1">{PROJECT_STATUS_LABELS[project.status]}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Vlastník</dt>
            <dd className="mt-1 flex items-center gap-2">
              <UserAvatar user={project.owner} size="xs" className="ring-0" /> {project.owner.name}
            </dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Vytvořeno</dt>
            <dd className="mt-1">{formatDate(project.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[12px] font-bold tracking-wide text-muted-foreground uppercase">Vaše role</dt>
            <dd className="mt-1">{PROJECT_ROLE_LABELS[project.myRole]}</dd>
          </div>
        </dl>
      </Card>

      <MembersCard />
      <LabelsCard />
      <DangerZone />

      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
    </div>
  );
}
