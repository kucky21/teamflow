import { Menu, Search } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { TaskPreviewSheet } from '@/features/tasks/task-preview-sheet';

import { CommandSearch } from './command-search';
import { Logo } from './logo';
import { PageLoader } from './page-header';
import { Sidebar } from './sidebar';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  // Zavře mobilní menu při navigaci (úprava stavu během renderu, bez efektu).
  const [navPath, setNavPath] = useState(location.pathname);
  if (navPath !== location.pathname) {
    setNavPath(location.pathname);
    setMobileNavOpen(false);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Přeskočit na obsah
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 border-r border-border bg-sidebar lg:block">
        <Sidebar onSearch={() => setSearchOpen(true)} />
      </aside>

      {/* Mobilní sidebar */}
      <DialogPrimitive.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-fade-in lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-border bg-sidebar shadow-pop outline-none lg:hidden">
            <DialogPrimitive.Title className="sr-only">Navigace</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Hlavní menu aplikace</DialogPrimitive.Description>
            <Sidebar
              onSearch={() => {
                setMobileNavOpen(false);
                setSearchOpen(true);
              }}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon-sm" aria-label="Otevřít menu" onClick={() => setMobileNavOpen(true)}>
            <Menu />
          </Button>
          <Logo className="[&_span]:text-[15px]" />
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label="Hledat"
            onClick={() => setSearchOpen(true)}
          >
            <Search />
          </Button>
        </header>

        <main id="main" className="min-w-0 flex-1">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <TaskPreviewSheet />
    </div>
  );
}
