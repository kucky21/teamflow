import type { ReactNode } from 'react';
import { Logo, PriorityIcon, StatusIcon } from '@/components/domain';

function PreviewCard({
  id,
  title,
  tone,
  priority,
}: {
  id: string;
  title: string;
  tone: string;
  priority: 'HIGH' | 'MEDIUM' | 'URGENT' | 'LOW';
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] text-teal-100/60">{id}</span>
        <PriorityIcon priority={priority} className="size-3.5 !text-teal-100/80" />
      </div>
      <p className="mt-1.5 text-[12.5px] leading-snug font-semibold text-white/90">{title}</p>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className={`h-1.5 w-10 rounded-full ${tone}`} />
        <span className="h-1.5 w-6 rounded-full bg-white/15" />
      </div>
    </div>
  );
}

/** Rozvržení přihlašovacích stránek – formulář vlevo, ukázka produktu vpravo. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] leading-tight font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-[14.5px] text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="text-xs text-subtle-foreground">© {new Date().getFullYear()} TeamFlow · Referenční projekt</p>
      </main>

      <aside
        aria-hidden
        className="relative hidden overflow-hidden bg-[#0b1a1f] lg:block"
        style={{
          backgroundImage:
            'radial-gradient(60rem 40rem at 110% -10%, rgba(20,184,166,0.35), transparent 60%), radial-gradient(40rem 30rem at -10% 110%, rgba(37,99,235,0.25), transparent 60%)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="max-w-md">
            <p className="text-sm font-semibold tracking-wide text-teal-300">Plánování bez chaosu</p>
            <h2 className="mt-3 text-[34px] leading-[1.1] font-extrabold tracking-tight text-white">
              Celý tým, všechny úkoly, jeden plynulý tok práce.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-teal-50/70">
              Kanban s drag & drop, přehledy v reálném čase, oprávnění na úrovni projektu a kompletní historie změn.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 [transform:perspective(1400px)_rotateX(8deg)_rotateZ(-2deg)]">
            {(
              [
                [
                  'TODO',
                  'K řešení',
                  [
                    ['TF-112', 'Notifikace o termínu', 'bg-sky-400/70', 'MEDIUM'],
                    ['TF-118', 'Export do CSV', 'bg-violet-400/70', 'LOW'],
                  ],
                ],
                [
                  'IN_PROGRESS',
                  'Probíhá',
                  [
                    ['TF-104', 'Drag & drop mezi sloupci', 'bg-amber-400/80', 'URGENT'],
                    ['TF-109', 'Tmavý režim grafů', 'bg-teal-400/70', 'HIGH'],
                  ],
                ],
                ['DONE', 'Hotovo', [['TF-97', 'Rate limiting přihlášení', 'bg-emerald-400/80', 'HIGH']]],
              ] as const
            ).map(([status, label, cards]) => (
              <div key={status} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <div className="mb-2.5 flex items-center gap-1.5 px-1">
                  <StatusIcon status={status} className="size-3.5" />
                  <span className="text-[11.5px] font-bold text-white/80">{label}</span>
                </div>
                <div className="grid gap-2">
                  {cards.map(([id, title, tone, priority]) => (
                    <PreviewCard key={id} id={id} title={title} tone={tone} priority={priority} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
