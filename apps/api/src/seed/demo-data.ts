import { randomUUID } from 'node:crypto';

import {
  type ActivityChange,
  type ActivityType,
  formatTaskKey,
  type ProjectRole,
  type TaskPriority,
  type TaskStatus,
} from '@teamflow/shared';

import { POSITION_STEP } from '../domain/ordering.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { Db } from '../lib/prisma.js';
import { hashPassword } from '../modules/auth/password.js';

function required<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Seed: chybí záznam pro klíč ${String(key)}.`);
  return value;
}

/**
 * Demo data pro lokální prezentaci. Přihlašovací údaje jsou veřejně známé,
 * proto se seed v produkčním prostředí (APP_ENV=production) odmítne spustit.
 */
export const DEMO_EMAIL = 'demo@teamflow.local';
export const DEMO_PASSWORD = 'Demo1234!';

const DAY = 24 * 60 * 60 * 1000;

/** Deterministický PRNG (mulberry32) – seed dává pokaždé stejná data. */
function createRandom(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    chance: (p: number) => next() < p,
    weighted: <T>(entries: readonly (readonly [T, number])[]): T => {
      const last = entries.at(-1);
      if (!last) throw new Error('weighted() vyžaduje alespoň jednu položku.');
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = next() * total;
      for (const [value, weight] of entries) {
        r -= weight;
        if (r <= 0) return value;
      }
      return last[0];
    },
  };
}

const USERS = [
  { key: 'tereza', name: 'Tereza Dvořáková', email: DEMO_EMAIL, avatarColor: '#0EA5A4' },
  { key: 'jakub', name: 'Jakub Novák', email: 'jakub.novak@teamflow.local', avatarColor: '#2563EB' },
  { key: 'eliska', name: 'Eliška Svobodová', email: 'eliska.svobodova@teamflow.local', avatarColor: '#DB2777' },
  { key: 'martin', name: 'Martin Procházka', email: 'martin.prochazka@teamflow.local', avatarColor: '#EA580C' },
  { key: 'lucie', name: 'Lucie Černá', email: 'lucie.cerna@teamflow.local', avatarColor: '#7C3AED' },
  { key: 'ondrej', name: 'Ondřej Kučera', email: 'ondrej.kucera@teamflow.local', avatarColor: '#65A30D' },
  { key: 'katerina', name: 'Kateřina Veselá', email: 'katerina.vesela@teamflow.local', avatarColor: '#0891B2' },
  { key: 'tomas', name: 'Tomáš Horák', email: 'tomas.horak@teamflow.local', avatarColor: '#9333EA' },
] as const;
type UserKey = (typeof USERS)[number]['key'];

interface ProjectSeed {
  key: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
  owner: UserKey;
  members: [UserKey, ProjectRole][];
  labels: [string, string][];
  tasks: [string, string, string[]][];
}

const PROJECTS: ProjectSeed[] = [
  {
    key: 'TF',
    name: 'TeamFlow Web',
    description: 'Webový klient TeamFlow – Kanban, přehledy a správa projektů pro menší týmy.',
    color: '#0EA5A4',
    icon: 'layers',
    status: 'ACTIVE',
    owner: 'tereza',
    members: [
      ['jakub', 'PROJECT_MANAGER'],
      ['eliska', 'MEMBER'],
      ['lucie', 'MEMBER'],
      ['ondrej', 'MEMBER'],
      ['tomas', 'MEMBER'],
    ],
    labels: [
      ['Chyba', '#E11D48'],
      ['Funkce', '#2563EB'],
      ['Frontend', '#0EA5A4'],
      ['UX', '#DB2777'],
      ['Výkon', '#D97706'],
      ['Technický dluh', '#475569'],
    ],
    tasks: [
      [
        'Drag & drop mezi sloupci Kanbanu',
        'Přesun karet mezi sloupci včetně optimistické aktualizace a rollbacku při chybě.',
        ['Funkce', 'Frontend'],
      ],
      [
        'Rychlý náhled úkolu z karty',
        'Po kliknutí na kartu otevřít boční panel s detailem bez opuštění boardu.',
        ['Funkce', 'UX'],
      ],
      ['Tmavý režim pro grafy', 'Barvy os a mřížky v Recharts musí respektovat aktuální motiv.', ['Frontend', 'UX']],
      ['Opravit blikání skeletonu při přepnutí projektu', '', ['Chyba', 'Frontend']],
      [
        'Klávesové zkratky pro vytvoření úkolu',
        'Zkratka „C“ otevře dialog nového úkolu v aktuálním projektu.',
        ['Funkce'],
      ],
      ['Lazy loading stránky s aktivitami', '', ['Výkon']],
      [
        'Sjednotit formát dat v tabulkách',
        'Všude používat krátký český formát (12. 3. 2025).',
        ['UX', 'Technický dluh'],
      ],
      ['Prázdné stavy pro filtry bez výsledků', '', ['UX']],
      [
        'Responzivní sidebar na tabletech',
        'Pod 1024 px sbalit sidebar do ikon, pod 768 px do vysouvacího menu.',
        ['Frontend'],
      ],
      ['Přístupnost: focus ring u karet', '', ['UX', 'Frontend']],
      ['Upozornění na úkoly po termínu', 'Zvýraznit termín červeně a zobrazit počet v přehledu.', ['Funkce']],
      ['Refaktoring API klienta', 'Vyčlenit práci s CSRF tokenem a chybami do jednoho modulu.', ['Technický dluh']],
      ['Debounce fulltextového vyhledávání', '', ['Výkon', 'Frontend']],
      ['Oprava řazení podle priority', 'Řazení „od nejvyšší“ vracelo urgentní úkoly na konec.', ['Chyba']],
      ['Toast notifikace po uložení', '', ['UX']],
      ['Stránkování seznamu úkolů', '', ['Funkce']],
      ['Export úkolů do CSV', 'Export aktuálně filtrovaného seznamu.', ['Funkce']],
      ['Animace přesunu karty', '', ['UX', 'Frontend']],
      ['Zrychlit první načtení dashboardu', 'Rozdělit bundle a přednačíst fonty.', ['Výkon']],
      ['Chybný počet úkolů ve sloupci po filtrování', '', ['Chyba', 'Frontend']],
    ],
  },
  {
    key: 'MOB',
    name: 'Mobilní aplikace',
    description: 'Nativní aplikace pro iOS a Android – notifikace, offline režim a rychlé zadávání úkolů.',
    color: '#7C3AED',
    icon: 'smartphone',
    status: 'ACTIVE',
    owner: 'jakub',
    members: [
      ['tereza', 'PROJECT_MANAGER'],
      ['katerina', 'MEMBER'],
      ['ondrej', 'MEMBER'],
      ['tomas', 'MEMBER'],
    ],
    labels: [
      ['Chyba', '#E11D48'],
      ['Funkce', '#2563EB'],
      ['iOS', '#475569'],
      ['Android', '#65A30D'],
      ['UX', '#DB2777'],
    ],
    tasks: [
      ['Push notifikace pro přiřazené úkoly', 'Notifikace při přiřazení a při novém komentáři.', ['Funkce']],
      ['Offline fronta změn', 'Ukládat změny lokálně a synchronizovat po obnovení připojení.', ['Funkce']],
      ['Pád aplikace při otevření prázdného projektu', '', ['Chyba', 'Android']],
      ['Přihlášení přes biometrii', '', ['Funkce', 'iOS']],
      ['Widget „Moje úkoly“ na plochu', '', ['Funkce', 'iOS']],
      ['Tmavý režim podle systému', '', ['UX']],
      ['Optimalizace velikosti balíčku', 'Cílová velikost pod 25 MB.', ['Android']],
      ['Gesto pro změnu stavu úkolu', 'Swipe doprava = další stav, doleva = předchozí.', ['UX']],
      ['Lokalizace do angličtiny', '', ['Funkce']],
      ['Oprava zobrazení diakritiky v notifikacích', '', ['Chyba', 'Android']],
      ['Rychlé přidání úkolu ze sdílení', 'Integrace se systémovým share sheetem.', ['Funkce']],
      ['Nahrávání příloh z fotoaparátu', '', ['Funkce']],
      ['Release 1.2 do App Store', '', ['iOS']],
      ['Crash reporting a sledování výkonu', '', ['Funkce']],
      ['Přepracovat onboarding', 'Zkrátit na tři obrazovky a přidat ukázkový projekt.', ['UX']],
      ['Synchronizace štítků s webem', '', ['Chyba']],
      ['Testy na starších zařízeních', '', ['Android']],
      ['Animace při dokončení úkolu', '', ['UX']],
    ],
  },
  {
    key: 'API',
    name: 'Platforma API',
    description: 'Backendové služby, autentizace, integrace a provozní infrastruktura.',
    color: '#2563EB',
    icon: 'database',
    status: 'ACTIVE',
    owner: 'martin',
    members: [
      ['tereza', 'MEMBER'],
      ['jakub', 'MEMBER'],
      ['lucie', 'PROJECT_MANAGER'],
      ['ondrej', 'MEMBER'],
    ],
    labels: [
      ['Chyba', '#E11D48'],
      ['Backend', '#7C3AED'],
      ['Bezpečnost', '#EA580C'],
      ['Infrastruktura', '#475569'],
      ['Výkon', '#D97706'],
    ],
    tasks: [
      ['Rotace session tokenů', 'Klouzavá expirace a zneplatnění relací po změně hesla.', ['Bezpečnost']],
      ['Rate limiting přihlašování', '', ['Bezpečnost', 'Backend']],
      ['Index pro fulltext úkolů', 'GIN index nad generovaným tsvector sloupcem.', ['Výkon']],
      ['Zálohování databáze', 'Denní zálohy s retencí 14 dní a testem obnovy.', ['Infrastruktura']],
      ['OpenAPI dokumentace odpovědí', '', ['Backend']],
      ['Pomalé načítání aktivit u velkých projektů', 'Kurzorové stránkování místo offsetu.', ['Výkon', 'Chyba']],
      ['Webhooky pro integrace', '', ['Backend']],
      ['Audit log pro změny oprávnění', '', ['Bezpečnost']],
      ['Migrace na PostgreSQL 18', '', ['Infrastruktura']],
      ['Strukturované logování s request ID', '', ['Infrastruktura', 'Backend']],
      ['Validace vstupů pomocí Zod', '', ['Backend']],
      ['Chyba 500 při mazání štítku', 'Chyběla kaskáda na vazební tabulce.', ['Chyba']],
      ['Healthcheck s kontrolou databáze', '', ['Infrastruktura']],
      ['CSRF ochrana zápisových požadavků', '', ['Bezpečnost']],
      ['Agregace pro dashboard v SQL', '', ['Výkon', 'Backend']],
      ['Pravidelný úklid prošlých relací', '', ['Backend']],
      ['Penetrační test před spuštěním', '', ['Bezpečnost']],
      ['CI pipeline s integračními testy', '', ['Infrastruktura']],
    ],
  },
  {
    key: 'DS',
    name: 'Design systém',
    description: 'Sdílené komponenty, typografie a barevné tokeny pro všechny produkty.',
    color: '#DB2777',
    icon: 'palette',
    status: 'PLANNING',
    owner: 'tereza',
    members: [
      ['eliska', 'PROJECT_MANAGER'],
      ['katerina', 'MEMBER'],
      ['lucie', 'MEMBER'],
    ],
    labels: [
      ['Komponenty', '#0EA5A4'],
      ['Tokeny', '#7C3AED'],
      ['Dokumentace', '#475569'],
      ['Přístupnost', '#65A30D'],
    ],
    tasks: [
      ['Barevné tokeny pro světlý a tmavý režim', '', ['Tokeny']],
      ['Komponenta Dialog', '', ['Komponenty']],
      ['Typografická škála', 'Velikosti, výšky řádků a váhy pro nadpisy i text.', ['Tokeny']],
      ['Kontrast barev podle WCAG AA', '', ['Přístupnost']],
      ['Dokumentace komponent v Storybooku', '', ['Dokumentace']],
      ['Komponenta Combobox', '', ['Komponenty']],
      ['Ikonografie a velikosti ikon', '', ['Tokeny']],
      ['Stavy formulářových prvků', 'Hover, focus, disabled, error.', ['Komponenty', 'Přístupnost']],
      ['Pravidla pro spacing', '', ['Tokeny', 'Dokumentace']],
      ['Komponenta Toast', '', ['Komponenty']],
      ['Navigace klávesnicí v menu', '', ['Přístupnost']],
      ['Průvodce přispíváním', '', ['Dokumentace']],
      ['Skeleton loadery', '', ['Komponenty']],
      ['Audit stávajících obrazovek', '', ['Dokumentace']],
      ['Animace a easing tokeny', '', ['Tokeny']],
      ['Komponenta Tabulka s řazením', '', ['Komponenty']],
    ],
  },
];

const COMMENTS = [
  'Podívám se na to dnes odpoledne.',
  'Mám rozpracováno, zítra pošlu na review.',
  'Můžeme to probrat na standupu? Nejsem si jistý rozsahem.',
  'Přidal jsem screenshot do popisu, chování je vidět i na stagingu.',
  'Hotovo, prosím o kontrolu.',
  'Díky! Vypadá to dobře, jen drobnost v pojmenování.',
  'Tohle blokuje release, dávám vyšší prioritu.',
  'Ověřeno na Chrome, Firefox i Safari.',
  'Navrhuji rozdělit na dva menší úkoly.',
  'Testy procházejí, mergnuto.',
  'Potřebuji ještě potvrzení od designu.',
  'Reprodukováno – nastává jen při pomalém připojení.',
  'Upravil jsem odhad, bude to o něco náročnější.',
  'Doplnil jsem akceptační kritéria.',
];

export interface SeedSummary {
  users: number;
  projects: number;
  tasks: number;
  comments: number;
  activities: number;
}

export async function seedDemoData(db: Db, now = new Date()): Promise<SeedSummary> {
  const rnd = createRandom(20251118);
  const ago = (days: number, jitterHours = 0) =>
    new Date(now.getTime() - days * DAY - rnd.int(0, jitterHours) * 60 * 60 * 1000);
  const dateOnly = (offsetDays: number) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return new Date(d.getTime() + offsetDays * DAY);
  };

  // --- uživatelé -------------------------------------------------------------
  const userIds = new Map<UserKey, string>();
  const userNames = new Map<string, string>();
  const users: Prisma.UserCreateManyInput[] = [];
  for (const u of USERS) {
    const id = randomUUID();
    userIds.set(u.key, id);
    userNames.set(id, u.name);
    users.push({
      id,
      name: u.name,
      email: u.email,
      avatarColor: u.avatarColor,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      createdAt: ago(90, 48),
    });
  }
  const uid = (key: UserKey) => required(userIds, key);

  const projects: Prisma.ProjectCreateManyInput[] = [];
  const members: Prisma.ProjectMemberCreateManyInput[] = [];
  const labels: Prisma.LabelCreateManyInput[] = [];
  const tasks: Prisma.TaskCreateManyInput[] = [];
  const taskLabels: Prisma.TaskLabelCreateManyInput[] = [];
  const comments: Prisma.TaskCommentCreateManyInput[] = [];
  const activities: Prisma.ActivityLogCreateManyInput[] = [];

  const log = (
    type: ActivityType,
    projectId: string,
    actorId: string,
    createdAt: Date,
    extra: {
      taskId?: string;
      task?: { key: string; title: string };
      changes?: ActivityChange[];
      meta?: Record<string, string>;
    } = {},
  ) => {
    activities.push({
      id: randomUUID(),
      type,
      projectId,
      actorId,
      taskId: extra.taskId ?? null,
      changes: extra.changes ?? [],
      meta: { ...extra.meta, ...(extra.task ? { taskKey: extra.task.key, taskTitle: extra.task.title } : {}) },
      createdAt,
    });
  };

  for (const [pIndex, p] of PROJECTS.entries()) {
    const projectId = randomUUID();
    const createdAt = ago(75 - pIndex * 6, 12);
    const ownerId = uid(p.owner);
    projects.push({
      id: projectId,
      key: p.key,
      name: p.name,
      description: p.description,
      color: p.color,
      icon: p.icon,
      status: p.status,
      ownerId,
      taskCounter: p.tasks.length,
      createdAt,
    });
    log('PROJECT_CREATED', projectId, ownerId, createdAt, { meta: { projectName: p.name } });

    const memberIds = [ownerId];
    members.push({ projectId, userId: ownerId, role: 'ADMIN', joinedAt: createdAt });
    for (const [mIndex, [key, role]] of p.members.entries()) {
      const joinedAt = new Date(createdAt.getTime() + (mIndex + 1) * 60 * 60 * 1000);
      members.push({ projectId, userId: uid(key), role, joinedAt });
      memberIds.push(uid(key));
      log('MEMBER_ADDED', projectId, ownerId, joinedAt, {
        meta: {
          memberName: required(userNames, uid(key)),
          role: role === 'PROJECT_MANAGER' ? 'Projektový manažer' : 'Člen',
        },
      });
    }

    const labelIds = new Map<string, string>();
    for (const [name, color] of p.labels) {
      const id = randomUUID();
      labelIds.set(name, id);
      labels.push({ id, projectId, name, color, createdAt });
    }

    const columnCounters = new Map<TaskStatus, number>();
    for (const [tIndex, [title, description, taskLabelNames]] of p.tasks.entries()) {
      const id = randomUUID();
      const number = tIndex + 1;
      const key = formatTaskKey(p.key, number);
      const status: TaskStatus =
        p.status === 'PLANNING'
          ? rnd.weighted([
              ['BACKLOG', 4],
              ['TODO', 3],
              ['IN_PROGRESS', 2],
              ['REVIEW', 1],
              ['DONE', 2],
            ] as const)
          : rnd.weighted([
              ['BACKLOG', 2],
              ['TODO', 3],
              ['IN_PROGRESS', 3],
              ['REVIEW', 2],
              ['DONE', 6],
            ] as const);
      const priority: TaskPriority = rnd.weighted([
        ['LOW', 2],
        ['MEDIUM', 4],
        ['HIGH', 3],
        ['URGENT', 1],
      ] as const);
      const creatorId = rnd.pick(memberIds);
      // Demo uživatel dostane víc úkolů, aby sekce „Moje úkoly“ nebyla prázdná.
      const demoIsMember = memberIds.includes(uid('tereza'));
      const assigneeId = rnd.chance(0.1) ? null : demoIsMember && rnd.chance(0.3) ? uid('tereza') : rnd.pick(memberIds);

      const taskCreatedAt = new Date(
        createdAt.getTime() + (tIndex + 1) * ((now.getTime() - createdAt.getTime()) / (p.tasks.length + 6)),
      );
      const ageDays = Math.max(1, Math.floor((now.getTime() - taskCreatedAt.getTime()) / DAY));
      let completedAt: Date | null = null;
      if (status === 'DONE') {
        completedAt = ago(rnd.int(0, Math.min(29, ageDays - 1)), 10);
        if (completedAt < taskCreatedAt) completedAt = new Date(taskCreatedAt.getTime() + 6 * 60 * 60 * 1000);
        if (completedAt > now) completedAt = now;
      }
      let dueDate: Date | null = null;
      if (rnd.chance(0.75)) {
        dueDate = status !== 'DONE' && rnd.chance(0.3) ? dateOnly(-rnd.int(1, 12)) : dateOnly(rnd.int(-20, 25));
      }

      const position = ((columnCounters.get(status) ?? 0) + 1) * POSITION_STEP;
      columnCounters.set(status, (columnCounters.get(status) ?? 0) + 1);

      tasks.push({
        id,
        projectId,
        number,
        title,
        description: description || null,
        status,
        priority,
        position,
        assigneeId,
        creatorId,
        dueDate,
        completedAt,
        createdAt: taskCreatedAt,
        updatedAt: completedAt ?? taskCreatedAt,
      });
      for (const labelName of taskLabelNames) {
        const labelId = labelIds.get(labelName);
        if (labelId) taskLabels.push({ taskId: id, labelId });
      }

      const ref = { key, title };
      log('TASK_CREATED', projectId, creatorId, taskCreatedAt, { taskId: id, task: ref });
      if (assigneeId && assigneeId !== creatorId) {
        log('TASK_UPDATED', projectId, creatorId, new Date(taskCreatedAt.getTime() + 20 * 60 * 1000), {
          taskId: id,
          task: ref,
          changes: [{ field: 'assignee', from: null, to: required(userNames, assigneeId) }],
        });
      }
      const actor = assigneeId ?? creatorId;
      // Průchod workflow až do aktuálního stavu (např. DONE: In Progress → Review → Done).
      const flow: TaskStatus[] = ['IN_PROGRESS', 'REVIEW', 'DONE'];
      const path = flow.slice(0, flow.indexOf(status) + 1);
      if (status !== 'BACKLOG' && status !== 'TODO') {
        const end = completedAt ?? new Date(Math.min(now.getTime(), taskCreatedAt.getTime() + ageDays * DAY * 0.8));
        let from: TaskStatus = 'TODO';
        path.forEach((to, i) => {
          const at = new Date(
            taskCreatedAt.getTime() + ((end.getTime() - taskCreatedAt.getTime()) * (i + 1)) / path.length,
          );
          log('TASK_MOVED', projectId, actor, at, {
            taskId: id,
            task: ref,
            changes: [{ field: 'status', from, to }],
          });
          from = to;
        });
      }

      if (rnd.chance(0.6)) {
        const count = rnd.int(1, 4);
        for (let c = 0; c < count; c++) {
          const authorId = rnd.pick(memberIds);
          const span = Math.max(1, now.getTime() - taskCreatedAt.getTime());
          const commentAt = new Date(taskCreatedAt.getTime() + (span * (c + 1)) / (count + 1));
          const body = rnd.pick(COMMENTS);
          comments.push({ id: randomUUID(), taskId: id, authorId, body, createdAt: commentAt, updatedAt: commentAt });
          log('COMMENT_ADDED', projectId, authorId, commentAt, { taskId: id, task: ref, meta: { excerpt: body } });
        }
      }
    }
  }

  await db.$transaction(async (tx) => {
    await tx.user.createMany({ data: users });
    await tx.project.createMany({ data: projects });
    await tx.projectMember.createMany({ data: members });
    await tx.label.createMany({ data: labels });
    await tx.task.createMany({ data: tasks });
    await tx.taskLabel.createMany({ data: taskLabels });
    await tx.taskComment.createMany({ data: comments });
    await tx.activityLog.createMany({ data: activities });
  });

  return {
    users: users.length,
    projects: projects.length,
    tasks: tasks.length,
    comments: comments.length,
    activities: activities.length,
  };
}
