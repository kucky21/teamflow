import { hasProjectPermission } from '@teamflow/shared';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useArchiveProject, useDeleteProject } from '@/features/projects/api';
import { useProjectContext } from '@/features/projects/project-context';
import { errorMessage } from '@/lib/api';

export function DangerZone() {
  const { project } = useProjectContext();
  const navigate = useNavigate();
  const archive = useArchiveProject(project.id);
  const del = useDeleteProject(project.id);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState('');

  if (!hasProjectPermission(project.myRole, 'project:archive')) return null;
  const archived = Boolean(project.archivedAt);

  return (
    <Card className="border-destructive/30">
      <CardHeader title="Nebezpečná zóna" description="Tyto akce ovlivní všechny členy projektu." />
      <div className="grid gap-0 divide-y divide-border p-5 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-[13.5px] font-bold">{archived ? 'Obnovit projekt z archivu' : 'Archivovat projekt'}</p>
            <p className="text-[13px] text-muted-foreground">
              {archived
                ? 'Projekt bude opět aktivní a upravitelný.'
                : 'Projekt bude jen pro čtení a zmizí z přehledů. Archivaci lze kdykoli vrátit.'}
            </p>
          </div>
          {archived ? (
            <Button
              variant="secondary"
              loading={archive.isPending}
              onClick={() =>
                archive.mutate(false, {
                  onSuccess: () => toast.success('Projekt byl obnoven z archivu.'),
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              <ArchiveRestore /> Obnovit
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmArchive(true)}>
              <Archive /> Archivovat
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div>
            <p className="text-[13.5px] font-bold">Smazat projekt</p>
            <p className="text-[13px] text-muted-foreground">
              {archived
                ? 'Trvale odstraní projekt včetně úkolů, komentářů a historie.'
                : 'Smazat lze pouze archivovaný projekt.'}
            </p>
          </div>
          <Button variant="destructive" disabled={!archived} onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Smazat projekt
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`Archivovat projekt ${project.name}?`}
        description="Projekt bude pouze pro čtení. Úkoly zůstanou zachovány a projekt lze později obnovit."
        confirmLabel="Archivovat"
        destructive={false}
        loading={archive.isPending}
        onConfirm={() =>
          archive.mutate(true, {
            onSuccess: () => {
              toast.success('Projekt byl archivován.');
              setConfirmArchive(false);
            },
            onError: (e) => toast.error(errorMessage(e)),
          })
        }
      />

      <Dialog
        open={confirmDelete}
        onOpenChange={(o) => {
          setConfirmDelete(o);
          if (!o) setTyped('');
        }}
      >
        <DialogContent>
          <DialogHeader
            title="Trvale smazat projekt?"
            description={
              <>
                Tato akce je nevratná. Pro potvrzení napište klíč projektu{' '}
                <strong className="font-mono">{project.key}</strong>.
              </>
            }
          />
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            aria-label="Klíč projektu pro potvrzení"
            className="font-mono"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              disabled={typed.trim().toUpperCase() !== project.key}
              loading={del.isPending}
              onClick={() =>
                del.mutate(undefined, {
                  onSuccess: () => {
                    toast.success('Projekt byl smazán.');
                    void navigate('/projects', { replace: true });
                  },
                  onError: (e) => toast.error(errorMessage(e)),
                })
              }
            >
              Smazat navždy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
