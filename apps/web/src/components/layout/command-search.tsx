import { CornerDownLeft, FolderKanban, Search } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { ProjectIcon } from '@/components/domain/project-icon';
import { StatusIcon } from '@/components/domain/status';
import { Kbd } from '@/components/ui/kbd';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects } from '@/features/projects/api';
import { useTasks } from '@/features/tasks/api';
import { cn } from '@/lib/utils';

interface ResultItem {
  id: string;
  kind: 'task' | 'project';
  href: string;
  render: () => React.ReactNode;
}

/** Globální vyhledávání (Ctrl/⌘+K) – fulltext úkolů a filtr projektů. */
export function CommandSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const deferred = useDeferredValue(query.trim());
  const navigate = useNavigate();
  const projects = useProjects();
  const tasks = useTasks({ q: deferred, sort: 'updatedAt', order: 'desc', page: 1, pageSize: 8 });

  // Po zavření dialogu začne příští hledání od nuly.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setQuery('');
      setActive(0);
    }
  }

  const items = useMemo<ResultItem[]>(() => {
    const needle = deferred.toLocaleLowerCase('cs');
    const projectItems: ResultItem[] = (projects.data ?? [])
      .filter((p) => !needle || p.name.toLocaleLowerCase('cs').includes(needle) || p.key.toLowerCase().includes(needle))
      .slice(0, needle ? 4 : 3)
      .map((p) => ({
        id: `p-${p.id}`,
        kind: 'project',
        href: `/projects/${p.id}/board`,
        render: () => (
          <>
            <ProjectIcon icon={p.icon} color={p.color} size="xs" />
            <span className="truncate font-semibold">{p.name}</span>
            <span className="ml-auto font-mono text-[11px] text-subtle-foreground">{p.key}</span>
          </>
        ),
      }));
    const taskItems: ResultItem[] = (tasks.data?.items ?? []).map((t) => ({
      id: `t-${t.id}`,
      kind: 'task',
      href: `/tasks/${t.key}`,
      render: () => (
        <>
          <StatusIcon status={t.status} />
          <span className="w-16 shrink-0 font-mono text-[11.5px] text-muted-foreground">{t.key}</span>
          <span className="truncate">{t.title}</span>
          <span className="ml-auto hidden shrink-0 text-[11.5px] text-subtle-foreground sm:block">
            {t.project.name}
          </span>
        </>
      ),
    }));
    return [...taskItems, ...projectItems];
  }, [deferred, projects.data, tasks.data]);

  const go = (item: ResultItem | undefined) => {
    if (!item) return;
    onOpenChange(false);
    void navigate(item.href);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[oklch(0.15_0.02_250/0.45)] backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-pop outline-none data-[state=open]:animate-fade-in"
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, items.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              go(items[active]);
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Hledat</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Vyhledávání úkolů a projektů. Šipkami vyberte výsledek, Enter jej otevře.
          </DialogPrimitive.Description>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-4.5 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="Hledat úkoly podle názvu, popisu nebo klíče (TF-12)…"
              className="h-13 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle-foreground"
              aria-label="Hledaný výraz"
              role="combobox"
              aria-expanded
              aria-controls="command-results"
              aria-activedescendant={items[active]?.id}
            />
            <Kbd>Esc</Kbd>
          </div>
          <ul id="command-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
            {tasks.isPending && deferred ? (
              Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="m-1 h-9" />)
            ) : items.length === 0 ? (
              <li className="px-3 py-10 text-center text-sm text-muted-foreground">
                Pro „{deferred}“ nebylo nic nalezeno.
              </li>
            ) : (
              items.map((item, index) => {
                const showHeading = index === 0 || items[index - 1]?.kind !== item.kind;
                return (
                  <li key={item.id} role="presentation">
                    {showHeading ? (
                      <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[11px] font-bold tracking-wider text-subtle-foreground uppercase">
                        {item.kind === 'task' ? (
                          deferred ? (
                            'Úkoly'
                          ) : (
                            'Naposledy změněné úkoly'
                          )
                        ) : (
                          <>
                            <FolderKanban className="size-3" /> Projekty
                          </>
                        )}
                      </p>
                    ) : null}
                    <button
                      id={item.id}
                      type="button"
                      role="option"
                      aria-selected={index === active}
                      onMouseMove={() => setActive(index)}
                      onClick={() => go(item)}
                      className={cn(
                        'flex h-10 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[13.5px]',
                        index === active ? 'bg-accent' : '',
                      )}
                    >
                      {item.render()}
                      {index === active ? (
                        <CornerDownLeft className="size-3.5 shrink-0 text-subtle-foreground" />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
