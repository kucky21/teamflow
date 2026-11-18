# TeamFlow

**TeamFlow** je fullstack aplikace pro řízení menších softwarových týmů a projektů – projekty, úkoly s identifikátory
(`TF-104`), Kanban s drag & drop, komentáře, auditní historie změn, oprávnění na úrovni projektu a dashboard
s agregovanými daty z PostgreSQL. Rozhraní je v češtině, se světlým i tmavým režimem a responzivním layoutem.

Projekt slouží jako referenční ukázka produkčně orientovaného vývoje v Reactu, TypeScriptu a Node.js.

---

## Obsah

- [Funkce](#funkce)
- [Technologický stack](#technologický-stack)
- [Architektura](#architektura)
- [Rychlý start (Docker)](#rychlý-start-docker)
- [Lokální vývoj](#lokální-vývoj)
- [Migrace a demo data](#migrace-a-demo-data)
- [Demo účet](#demo-účet)
- [Testy a kvalita kódu](#testy-a-kvalita-kódu)
- [API dokumentace](#api-dokumentace)
- [Struktura adresářů](#struktura-adresářů)
- [Bezpečnost](#bezpečnost)
- [Příprava na deployment](#příprava-na-deployment)
- [Stav ověření](#stav-ověření)

---

## Funkce

| Oblast        | Co umí                                                                                                                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Účty**      | Registrace, přihlášení, odhlášení, úprava profilu, změna hesla (odhlásí ostatní relace).                                                                                                                 |
| **Projekty**  | CRUD, barva a ikona, stav (plánování / aktivní / pozastaveno / dokončeno), vlastník, členové s rolemi, archivace (projekt je pak jen pro čtení), trvalé smazání archivovaného projektu.                  |
| **Role**      | `Administrátor`, `Projektový manažer`, `Člen` – kontrolováno na backendu (viz [matice oprávnění](#oprávnění)).                                                                                           |
| **Úkoly**     | Identifikátor `KLÍČ-ČÍSLO`, název, popis, stav, priorita, řešitel, termín, štítky, komentáře, historie změn. Filtrování, řazení, stránkování a fulltext (bez ohledu na diakritiku, prefixové hledání).   |
| **Kanban**    | Drag & drop mezi sloupci i v rámci sloupce (myš, dotyk, klávesnice), optimistické aktualizace s rollbackem při chybě, pořadí uložené v databázi, rychlý náhled úkolu, odkaz na detail.                   |
| **Dashboard** | Aktivní projekty, otevřené úkoly, úkoly po termínu, dokončené úkoly, graf dokončených úkolů za 30 dní (v časovém pásmu uživatele), rozložení podle stavu, aktivita týmu, moje přiřazené úkoly.           |
| **Audit log** | Každá změna (úkoly, komentáře, členové, štítky, projekt) se zapisuje v transakci spolu se změnou samotnou; historie zůstává čitelná i po smazání úkolu.                                                  |
| **UI/UX**     | Sidebar navigace, globální hledání `Ctrl/⌘ + K`, modální dialogy, toasty, skeletony, prázdné a chybové stavy, sdílitelné filtry v URL, světlý / tmavý / systémový motiv, přístupnost (ARIA, klávesnice). |

## Technologický stack

**Frontend** – React 19, TypeScript, Vite 8, React Router 8, TanStack Query 5, Tailwind CSS 4, komponenty v duchu
shadcn/ui nad Radix UI (vlastní vizuální styl), React Hook Form + Zod, dnd-kit, Recharts, Lucide, Sonner.

**Backend** – Node.js 22, TypeScript, Fastify 5, Prisma 7 (driver adapter `@prisma/adapter-pg`), PostgreSQL 18,
Zod (validace + serializace odpovědí), OpenAPI 3.1 (`@fastify/swagger`), Pino, Argon2id, `@fastify/helmet`,
`@fastify/rate-limit`.

**Infrastruktura a kvalita** – npm workspaces (monorepo), Docker + Docker Compose, nginx, ESLint 10 (flat config,
typescript-eslint, React Hooks / React Compiler pravidla), Prettier, Vitest 5, Testing Library, Playwright,
GitHub Actions. TypeScript ve `strict` režimu včetně `noUncheckedIndexedAccess`.

> **Poznámka k verzím:** TypeScript je zafixován na řadě 6.0 – `typescript-eslint` zatím TypeScript 7 nepodporuje.
> Prisma je na stabilní řadě 7.x (řada 8 je v době vzniku pouze release candidate).

## Architektura

```
            ┌──────────────────────────── Docker Compose ────────────────────────────┐
 Prohlížeč ─┤  web (nginx :8080)  ──/api/*──▶  api (Fastify :4000)  ──▶  db (PostgreSQL) │
            │  statický React build             REST + OpenAPI          volume db-data │
            └────────────────────────────────────────────────────────────────────────┘
```

Frontend i API běží na **stejném originu** (nginx v Dockeru, proxy ve Vite při vývoji), takže session cookie je
first-party a není potřeba CORS.

### Monorepo

| Balíček           | Účel                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/shared` | Jediný zdroj pravdy: výčty, české popisky, Zod schémata vstupů, DTO odpovědí, matice oprávnění, klíče úkolů. |
| `apps/api`        | REST API.                                                                                                    |
| `apps/web`        | React SPA.                                                                                                   |
| `infra`           | Dockerfily, nginx konfigurace, entrypoint.                                                                   |

### Backend – vrstvy

- **Routes** (`modules/*/*.routes.ts`) – HTTP rozhraní, Zod schémata pro `body`/`params`/`querystring`/odpovědi.
- **Services** (`modules/*/*.service.ts`) – business logika a transakce. Závislosti dostávají přes konstruktor
  (kompoziční kořen v `services.ts`), takže testy pracují se skutečnou databází bez mocků frameworku.
- **Datová vrstva** – Prisma Client s explicitními `select`/`include` a mappery na DTO (`modules/mappers.ts`);
  hash hesla ani jiná interní pole nikdy neopustí server. Odpovědi navíc validuje serializer podle DTO schémat.
- **Access** (`modules/access/access.service.ts`) – centrální kontrola členství, role a archivace pro každou operaci.
- **Domain** (`domain/`) – čistá logika bez I/O: frakční řazení Kanbanu, stavba bezpečného `tsquery`, diff změn.
- **Plugins** – autentizace + CSRF (`plugins/auth.ts`), jednotný error handler (`plugins/error-handler.ts`).

Chyby mají vždy tvar `{ "error": { "code", "message", "details?" } }` (např. `VALIDATION_ERROR` s cestou k poli,
`PROJECT_ARCHIVED`, `CSRF_TOKEN_INVALID`).

### Databáze

Normalizované schéma (`apps/api/prisma/schema.prisma`): `User`, `Session`, `Project`, `ProjectMember`, `Task`,
`TaskComment`, `Label`, `TaskLabel`, `ActivityLog`.

- **Referenční integrita** – cizí klíče s promyšleným chováním: smazání projektu kaskádově maže úkoly/štítky/historii,
  smazání úkolu ponechá auditní záznamy (`task_id → NULL`, klíč a název zůstávají v `meta`), uživatele s úkoly nelze
  smazat (`RESTRICT`).
- **Indexy** – mj. `(project_id, status, position)` pro Kanban, `(assignee_id, status)`, `(project_id, created_at DESC)`
  pro audit log, GIN index nad generovaným sloupcem `search_vector` (fulltext bez diakritiky přes `unaccent`).
- **CHECK omezení** – formát klíče projektu, kladná čísla úkolů, konzistence `status = DONE ⇔ completed_at IS NOT NULL`.
- **Transakce** – založení úkolu (atomický inkrement čítače projektu), úpravy + audit log, přesuny na Kanbanu
  (zámek řádku projektu `SELECT … FOR UPDATE`), odebrání člena (uvolnění jeho úkolů), změna hesla (zneplatnění relací).

### Řazení na Kanbanu

Pozice úkolu je číslo s plovoucí čárkou. Klient posílá cílový sloupec a sousedy (`prevId`/`nextId`), server spočítá
střed mezi nimi – mění se tedy jediný řádek. Při vyčerpání přesnosti se sloupec přečísluje. Protože se pracuje se
sousedy, přesun funguje správně i ve filtrovaném pohledu. Frontend stejný výpočet provede optimisticky a při chybě
API obnoví původní stav.

## Rychlý start (Docker)

Požadavky: Docker s Docker Compose v2.

```bash
cp .env.example .env        # volitelné – bez .env se použijí výchozí hodnoty
docker compose up --build
```

Aplikace poběží na **http://localhost:8080**. Při startu API automaticky aplikuje migrace a – pokud je databáze
prázdná a nejde o produkční prostředí – naplní ji demo daty. Všechny služby mají healthchecky a databáze ukládá data
do pojmenovaného volume `db-data`.

| Služba | Adresa                                                |
| ------ | ----------------------------------------------------- |
| Web    | http://localhost:8080                                 |
| API    | http://localhost:8080/api (přes nginx)                |
| Docs   | http://localhost:8080/api/docs                        |
| DB     | `127.0.0.1:5433` (jen z hostitele, pro vývoj a testy) |

Úplný reset (smaže i databázi): `docker compose down -v`.

## Lokální vývoj

Požadavky: Node.js ≥ 22.12, npm 10+, Docker (pro PostgreSQL).

```bash
npm install
cp .env.example .env
npm run db:up            # spustí jen PostgreSQL v Dockeru (port 5433)
npm run db:migrate       # aplikuje migrace (prisma migrate dev)
npm run db:seed          # naplní databázi demo daty
npm run dev              # shared (watch) + API :4000 + web :5173
```

Frontend běží na http://localhost:5173 a proxuje `/api` na API.

## Migrace a demo data

| Příkaz                                    | Popis                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `npm run db:migrate`                      | Lokálně: `prisma migrate dev` (vytvoří/aplikuje migrace).              |
| `npm run db:migrate -w @teamflow/api`     | `prisma migrate deploy` – aplikace existujících migrací (CI/produkce). |
| `npm run db:seed`                         | Lokálně: **smaže všechna data** a vytvoří demo data znovu.             |
| `docker compose exec api npm run db:seed` | Totéž v běžícím kontejneru.                                            |

Migrace v Dockeru proběhnou automaticky při každém startu kontejneru API (`prisma migrate deploy`).
Seed se v prostředí `APP_ENV=production` odmítne spustit.

Demo data: 8 uživatelů, 4 projekty s různými rolemi, 72 úkolů (všechny stavy a priority, úkoly po termínu
i dokončené rozložené do posledních 30 dní), 100+ komentářů a ucelená historie aktivit.

## Demo účet

| E-mail                | Heslo       |
| --------------------- | ----------- |
| `demo@teamflow.local` | `Demo1234!` |

Demo uživatel je administrátorem dvou projektů, manažerem jednoho a členem jednoho – lze tak vyzkoušet všechny role.
Ostatní demo účty (`*@teamflow.local`) mají stejné heslo.

> ⚠️ Tyto údaje jsou veřejně známé a slouží **pouze pro lokální demo**. V produkci nastavte `APP_ENV=production`
> (seed se nespustí) a `VITE_SHOW_DEMO_HINT=false` (skryje nápovědu na přihlašovací stránce).

## Testy a kvalita kódu

```bash
npm run check        # lint + formát + typecheck + všechny unit/integrační testy
npm run lint         # ESLint (0 varování tolerováno)
npm run typecheck    # tsc --noEmit ve všech balíčcích
npm test             # Vitest – shared, API (unit + integrační), web
npm run test:e2e     # Playwright – proti běžící aplikaci (výchozí http://localhost:8080)
```

| Sada                             | Co ověřuje                                                                                                                                                                                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` (33 testů)     | Validační schémata a české hlášky, matice oprávnění, klíče úkolů.                                                                                                                                                             |
| `apps/api` unit (20 testů)       | Frakční řazení a přečíslování, sanitizace `tsquery`, diff změn, konfigurace.                                                                                                                                                  |
| `apps/api` integrační (49 testů) | Proti **skutečné PostgreSQL** (`teamflow_test`): autentizace a cookies, Argon2id, CSRF (token i origin), rate limiting, oprávnění rolí, archivace, kaskádové mazání, souběžné číslování, Kanban, fulltext, filtry, dashboard. |
| `apps/web` (26 testů)            | Optimistický přesun a výpočet sousedů, API klient (CSRF hlavička, chyby), formátování, komponenty.                                                                                                                            |
| E2E (4 testy)                    | Přihlášení / odhlášení, vytvoření projektu, vytvoření úkolu, přesun úkolu na Kanbanu a jeho persistence po obnovení stránky.                                                                                                  |

Integrační testy si databázi `teamflow_test` vytvoří samy (`DATABASE_URL_TEST`, výchozí `127.0.0.1:5433`) a před
během aplikují migrace; vyžadují tedy běžící PostgreSQL (`npm run db:up`).

E2E testy proti vývojovému serveru: `E2E_BASE_URL=http://localhost:5173 npm run test:e2e`.
E2E testy zakládají v databázi projekty pojmenované „E2E projekt …“; čistý demo stav obnoví
`docker compose exec api npm run db:seed`.
Prohlížeč pro Playwright nainstalujete příkazem `npx playwright install chromium` (v `apps/web`).

## API dokumentace

Interaktivní dokumentace (Swagger UI): **`/api/docs`**, specifikace OpenAPI 3.1 v JSON: **`/api/docs/json`**.
Schémata se generují ze stejných Zod definic, které API používá k validaci.

| Metoda a cesta                                                        | Popis                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `POST /api/auth/register` · `login` · `logout`                        | Registrace, přihlášení, odhlášení                                  |
| `GET /api/auth/me`                                                    | Přihlášený uživatel                                                |
| `PATCH /api/users/me` · `POST /api/users/me/password`                 | Profil, změna hesla                                                |
| `GET /api/users?q=&excludeProjectId=`                                 | Vyhledání uživatelů pro přidání do projektu                        |
| `GET/POST /api/projects`                                              | Seznam (`?archived=true`) a vytvoření projektu                     |
| `GET/PATCH/DELETE /api/projects/:id`                                  | Detail, úprava, smazání (jen archivovaného)                        |
| `POST /api/projects/:id/archive` · `unarchive`                        | Archivace / obnovení                                               |
| `GET /api/projects/:id/activity?cursor=`                              | Auditní log (kurzorové stránkování)                                |
| `GET/POST/PATCH/DELETE /api/projects/:id/members[/:userId]`           | Členové a role                                                     |
| `GET/POST/PATCH/DELETE /api/projects/:id/labels[/:labelId]`           | Štítky                                                             |
| `GET /api/projects/:id/board`                                         | Úkoly pro Kanban (filtry `q`, `assigneeId`, `priority`, `labelId`) |
| `POST /api/projects/:id/tasks`                                        | Vytvoření úkolu                                                    |
| `GET /api/tasks`                                                      | Seznam s filtry, fulltextem, řazením a stránkováním                |
| `GET/PATCH/DELETE /api/tasks/:idNeboKlíč`                             | Detail (UUID i `TF-104`), úprava, smazání                          |
| `POST /api/tasks/:id/move`                                            | Přesun na Kanbanu `{ status, prevId, nextId }`                     |
| `GET /api/tasks/:id/history`                                          | Historie změn úkolu                                                |
| `GET/POST /api/tasks/:id/comments` · `PATCH/DELETE /api/comments/:id` | Komentáře                                                          |
| `GET /api/dashboard?tz=Europe/Prague`                                 | Agregace pro dashboard                                             |
| `GET /api/health`                                                     | Stav služby a databáze                                             |

Zápisové požadavky přihlášeného uživatele musí obsahovat hlavičku `X-CSRF-Token` s hodnotou cookie `tf_csrf`.

## Struktura adresářů

```
teamflow/
├── apps/
│   ├── api/
│   │   ├── prisma/                 # schema.prisma + SQL migrace
│   │   ├── src/
│   │   │   ├── config/             # validace proměnných prostředí
│   │   │   ├── domain/             # čistá doménová logika (řazení, fulltext, diff)
│   │   │   ├── lib/                # Prisma klient, doménové chyby
│   │   │   ├── modules/            # auth, projects, tasks, comments, labels, activity, dashboard, access
│   │   │   ├── plugins/            # autentizace + CSRF, error handler
│   │   │   ├── seed/               # demo data a CLI
│   │   │   ├── app.ts              # sestavení Fastify aplikace (DI pro testy)
│   │   │   └── server.ts           # vstupní bod (seed při startu, graceful shutdown)
│   │   └── test/                   # integrační testy proti PostgreSQL
│   └── web/
│       ├── e2e/                    # Playwright testy
│       └── src/
│           ├── app/                # providery a router (lazy načítání stránek)
│           ├── components/         # UI primitiva, layout, doménové komponenty
│           ├── features/           # auth, dashboard, projects, board, tasks, activity, settings
│           ├── lib/                # API klient, query client, formátování, motiv
│           └── styles/             # Tailwind + designové tokeny (světlý/tmavý režim)
├── packages/shared/                # Zod schémata, DTO, výčty, oprávnění
├── infra/docker/                   # Dockerfily, nginx, entrypoint
├── .github/workflows/ci.yml        # CI: kvalita + E2E
└── compose.yaml
```

## Bezpečnost

- **Hesla** – Argon2id (19 MiB, 2 iterace, parametry dle OWASP), konstantní doba přihlášení i pro neexistující účet
  (ochrana proti enumeraci), jednotná chybová hláška.
- **Relace** – náhodný 256bit token v cookie `tf_session` (`HttpOnly`, `SameSite=Lax`, `Secure` dle konfigurace);
  v databázi je uložen jen jeho SHA-256 hash. Klouzavá expirace (7 dní), odhlášení relaci zneplatní na serveru,
  změna hesla zneplatní ostatní relace, prošlé relace se pravidelně mažou.
- **CSRF** – kombinace kontroly `Origin`/`Referer` (stejný host nebo `APP_ORIGIN`) a synchronizačního tokenu svázaného
  se session (`X-CSRF-Token` vs. cookie `tf_csrf`, porovnání v konstantním čase).
- **Autorizace** – každý endpoint ověřuje členství a roli na serveru (`AccessService`); nečlenům se vrací 404, aby
  nešlo zjišťovat existenci cizích projektů. Archivované projekty jsou jen pro čtení.
- **Validace** – všechny vstupy přes Zod (body, query, params), limity délek a velikosti požadavku (1 MB),
  odpovědi se serializují podle DTO schémat (žádné nechtěné úniky polí).
- **Injection** – Prisma s parametrizovanými dotazy; fulltextový dotaz se sanitizuje na písmena/číslice
  před sestavením `tsquery`.
- **Rate limiting** – přihlášení, registrace a změna hesla (výchozí 10 pokusů/min/IP).
- **HTTP hlavičky** – helmet na API, CSP a další hlavičky v nginx; frontend nepoužívá inline skripty.
- **Kontejnery** – API i nginx běží pod neprivilegovaným uživatelem, PostgreSQL je publikovaný jen na `127.0.0.1`.
- **Logování** – Pino se strukturovanými logy a request ID; cookies a CSRF token jsou v logu skryté.

Známé omezení: `npm audit` hlásí zranitelnost `picomatch` (ReDoS) pouze ve vývojových nástrojích; produkční
závislosti (`npm audit --omit=dev`) jsou bez nálezů.

## Příprava na deployment

1. **Proměnné prostředí** (viz `.env.example`):
   - `APP_ENV=production` – zakáže demo seed, `SEED_ON_START=false`.
   - Silné `POSTGRES_PASSWORD` (nebo `DATABASE_URL` na spravovanou databázi).
   - `APP_ORIGIN=https://vase-domena.cz`, `COOKIE_SECURE=true`, `TRUST_PROXY=true` za reverzní proxy.
   - `LOG_LEVEL=info`.
2. **Build frontendu** s `VITE_SHOW_DEMO_HINT=false`
   (`docker compose build --build-arg VITE_SHOW_DEMO_HINT=false web`, resp. `args` v compose).
3. **HTTPS** – TLS terminujte na load balanceru / reverzní proxy před službou `web`; port databáze nepublikujte.
4. **Migrace** se aplikují automaticky při startu API (`prisma migrate deploy`) a jsou idempotentní.
   Při více instancích API je bezpečné je spouštět paralelně (Prisma používá advisory lock).
5. **Zálohy** volume `db-data` / spravované databáze a monitoring endpointu `/api/health`.
6. **Škálování** – API je bezstavové (relace jsou v PostgreSQL), lze spustit více replik za nginx/load balancerem;
   rate limit je v paměti instance – pro více replik doporučujeme sdílené úložiště (např. Redis).

## Stav ověření

Ověřeno při vývoji (Windows 11, Docker Desktop, Node.js 22.14):

- ✅ `docker compose up --build` z prázdného volume – migrace, automatický seed, všechny healthchecky `healthy`.
- ✅ `npm run check` – ESLint (0 chyb/varování), Prettier, TypeScript, 128 unit a integračních testů.
- ✅ E2E testy (Playwright) proti Docker stacku, opakovaně stabilní.
- ✅ Ruční vizuální kontrola (screenshoty) – přihlášení, dashboard, Kanban, náhled úkolu, seznam, tmavý režim, mobil.
- ✅ Bezpečnostní hlavičky nginx, deep linky SPA, Swagger UI.

Neověřeno:

- ⚠️ Běh workflow v GitHub Actions – konfigurace je připravena (`.github/workflows/ci.yml`), ale nebyla spuštěna
  na GitHubu.
- ⚠️ Nasazení na veřejný hosting s HTTPS (postup výše je popsán, ale neproveden).
- ⚠️ Vizuální chování v Safari a Firefoxu (testováno v Chromiu).
