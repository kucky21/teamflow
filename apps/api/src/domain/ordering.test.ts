import { describe, expect, it } from 'vitest';

import { evenPositions, MIN_POSITION_GAP, POSITION_STEP, positionBetween, resolveNeighbours } from './ordering.js';

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
