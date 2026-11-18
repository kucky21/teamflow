import { type Dashboard, TASK_STATUS_LABELS } from '@teamflow/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

import { StatusIcon } from '@/components/domain/status';
import { STATUS_CSS_VAR } from '@/components/domain/tokens';
import { formatDate } from '@/lib/format';
import { plural } from '@/lib/utils';

function DayTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const point = payload?.[0]?.payload as { date: string; count: number } | undefined;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-[12.5px] shadow-pop">
      <p className="font-semibold">{formatDate(point.date, 'EEEE d. M.')}</p>
      <p className="mt-0.5 text-muted-foreground">
        <span className="font-bold text-foreground tabular">{point.count}</span>{' '}
        {plural(point.count, ['dokončený úkol', 'dokončené úkoly', 'dokončených úkolů'])}
      </p>
    </div>
  );
}

/** Dokončené úkoly po dnech – jedna řada, proto bez legendy (název nese titulek karty). */
export function CompletedChart({ data }: { data: Dashboard['completedByDay'] }) {
  const max = Math.max(...data.map((d) => d.count), 0);
  return (
    <figure className="m-0">
      <div className="h-60 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -24 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeWidth={1} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickFormatter={(v: string) => formatDate(v, 'd. M.')}
              interval={6}
              minTickGap={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              domain={[0, Math.max(4, max)]}
            />
            <Tooltip cursor={{ fill: 'var(--accent)' }} content={<DayTooltip />} isAnimationActive={false} />
            <Bar
              dataKey="count"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={16}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Tabulková verze pro čtečky obrazovky. */}
      <table className="sr-only">
        <caption>Dokončené úkoly za posledních 30 dní</caption>
        <thead>
          <tr>
            <th scope="col">Den</th>
            <th scope="col">Počet</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{formatDate(d.date)}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/**
 * Rozložení podle stavu – samostatné popsané řádky místo koláče.
 * Každý řádek nese ikonu, název i počet, takže identita nezávisí jen na barvě.
 */
export function StatusDistribution({ data }: { data: Dashboard['statusDistribution'] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <ul className="grid gap-3.5" aria-label="Rozložení úkolů podle stavu">
      {data.map((d) => {
        const share = total ? Math.round((d.count / total) * 100) : 0;
        return (
          <li key={d.status} className="grid gap-1.5">
            <div className="flex items-center gap-2 text-[13px]">
              <StatusIcon status={d.status} />
              <span className="font-semibold">{TASK_STATUS_LABELS[d.status]}</span>
              <span className="ml-auto font-bold tabular">{d.count}</span>
              <span className="w-10 text-right text-[12px] text-subtle-foreground tabular">{share} %</span>
            </div>
            <div className="h-2 rounded-full bg-muted" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(d.count / max) * 100}%`,
                  background: STATUS_CSS_VAR[d.status],
                  minWidth: d.count ? 6 : 0,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
