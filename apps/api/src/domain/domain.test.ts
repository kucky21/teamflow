import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config/env.js';
import { fromIsoDate, toIsoDate, todayUtc } from './dates.js';
import { evenPositions, MIN_POSITION_GAP, POSITION_STEP, positionBetween, resolveNeighbours } from './ordering.js';
import { buildPrefixTsQuery } from './search.js';
import { compactChanges, diffField, diffList, diffText } from './task-changes.js';

describe('positionBetween', () => {
  it('prázdný sloupec začíná na základním kroku', () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
  });

  it('vloží na začátek a na konec s odstupem kroku', () => {
    expect(positionBetween(null, 1024)).toBe(0);
    expect(positionBetween(2048, null)).toBe(2048 + POSITION_STEP);
  });

  it('vrátí střed mezi sousedy', () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
  });

  it('signalizuje nutnost přečíslování při vyčerpané mezeře nebo špatném pořadí', () => {
    expect(positionBetween(1, 1 + MIN_POSITION_GAP)).toBeNull();
    expect(positionBetween(5, 5)).toBeNull();
    expect(positionBetween(10, 5)).toBeNull();
  });

  it('opakované půlení drží pořadí, dokud nepožádá o přečíslování', () => {
    let next = 2048;
    let iterations = 0;
    for (;;) {
      const p = positionBetween(1024, next);
      if (p === null) break;
      expect(p).toBeGreaterThan(1024);
      expect(p).toBeLessThan(next);
      next = p;
      iterations++;
    }
    expect(iterations).toBeGreaterThan(20);
  });

  it('evenPositions rozloží položky rovnoměrně', () => {
    expect(evenPositions(3)).toEqual([1024, 2048, 3072]);
    expect(evenPositions(0)).toEqual([]);
  });
});

describe('resolveNeighbours', () => {
  const column = [
    { id: 'a', position: 1024 },
    { id: 'b', position: 2048 },
    { id: 'c', position: 3072 },
  ];

  it('prevId má přednost a další soused se dopočítá ze sloupce', () => {
    // I když klient (filtrovaný pohled) neviděl „b“, vložíme mezi a a b.
    expect(resolveNeighbours(column, 'a', 'c')).toEqual({ prev: column[0], next: column[1] });
  });

  it('jen nextId vloží před daný úkol', () => {
    expect(resolveNeighbours(column, null, 'b')).toEqual({ prev: column[0], next: column[1] });
    expect(resolveNeighbours(column, null, 'a')).toEqual({ prev: null, next: column[0] });
  });

  it('bez sousedů nebo s neexistujícími ID vloží na konec', () => {
    expect(resolveNeighbours(column, null, null)).toEqual({ prev: column[2], next: null });
    expect(resolveNeighbours(column, 'x', 'y')).toEqual({ prev: column[2], next: null });
    expect(resolveNeighbours([], null, null)).toEqual({ prev: null, next: null });
  });

  it('prevId posledního úkolu vloží na konec', () => {
    expect(resolveNeighbours(column, 'c', null)).toEqual({ prev: column[2], next: null });
  });
});

describe('buildPrefixTsQuery', () => {
  it('vytvoří prefixový dotaz s AND', () => {
    expect(buildPrefixTsQuery('Přihlášení Google')).toBe('přihlášení:* & google:*');
  });

  it('odstraní operátory a speciální znaky (ochrana proti injection do tsquery)', () => {
    expect(buildPrefixTsQuery("a & b | !c <-> d:* ' ;")).toBe('a:* & b:* & c:* & d:*');
    expect(buildPrefixTsQuery('  !!!  ')).toBeNull();
  });

  it('omezí počet termů', () => {
    expect(buildPrefixTsQuery('a b c d e', 2)).toBe('a:* & b:*');
  });
});

describe('task-changes', () => {
  it('zaznamená jen skutečné změny', () => {
    expect(diffField('title', 'A', 'A')).toBeNull();
    expect(diffField('title', 'A', 'B')).toEqual({ field: 'title', from: 'A', to: 'B' });
  });

  it('porovná seznamy bez ohledu na pořadí', () => {
    expect(diffList('labels', ['b', 'a'], ['a', 'b'])).toBeNull();
    expect(diffList('labels', ['a'], [])).toEqual({ field: 'labels', from: 'a', to: null });
  });

  it('u textu neukládá obsah a prázdné hodnoty považuje za shodné', () => {
    expect(diffText('description', null, '')).toBeNull();
    expect(diffText('description', 'x', 'y')).toEqual({ field: 'description', from: null, to: null });
  });

  it('compactChanges odfiltruje null', () => {
    expect(compactChanges([null, diffField('a', '1', '2'), null])).toHaveLength(1);
  });
});

describe('dates', () => {
  it('převádí mezi Date a YYYY-MM-DD bez posunu pásma', () => {
    expect(toIsoDate(fromIsoDate('2025-03-09'))).toBe('2025-03-09');
    expect(todayUtc(new Date('2025-03-09T23:59:00Z')).toISOString()).toBe('2025-03-09T00:00:00.000Z');
  });
});

describe('loadConfig', () => {
  it('rozparsuje seznam originů a booleany', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://x',
      APP_ORIGIN: 'http://a.cz/, https://b.cz',
      COOKIE_SECURE: 'true',
    });
    expect(config.allowedOrigins).toEqual(['http://a.cz', 'https://b.cz']);
    expect(config.cookieSecure).toBe(true);
    expect(config.trustProxy).toBe(false);
    expect(config.sessionTtlMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('selže bez DATABASE_URL se srozumitelnou chybou', () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
  });
});
