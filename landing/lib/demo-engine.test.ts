import { describe, it, expect } from 'vitest';
import {
  addMonths,
  cheapestSupplier,
  createInitialState,
  demoReducer,
  expiryKey,
  fefoBatch,
  nextAutoplayAction,
  sortByExpiry,
  totalStock,
  type DemoState,
} from './demo-engine';

const sellN = (
  state: DemoState,
  n: number,
  channel: 'counter' | 'online' = 'counter',
) => {
  let s = state;
  for (let i = 0; i < n; i++) s = demoReducer(s, { type: 'sell', channel });
  return s;
};

describe('expiry helpers', () => {
  it('orders MM/YY by year then month', () => {
    expect(expiryKey('11/26')).toBeLessThan(expiryKey('03/27'));
    const sorted = sortByExpiry([
      { code: 'b', expiry: '11/27', qty: 1, capacity: 1 },
      { code: 'a', expiry: '03/27', qty: 1, capacity: 1 },
    ]);
    expect(sorted.map((b) => b.code)).toEqual(['a', 'b']);
  });

  it('adds months across a year boundary', () => {
    expect(addMonths('11/27', 9)).toBe('08/28');
    expect(addMonths('03/27', 0)).toBe('03/27');
    expect(addMonths('12/27', 1)).toBe('01/28');
  });
});

describe('FEFO selling', () => {
  it('starts with 14 in stock across two batches', () => {
    expect(totalStock(createInitialState())).toBe(14);
  });

  it('sells from the earliest-expiring batch first', () => {
    const s = demoReducer(createInitialState(), {
      type: 'sell',
      channel: 'counter',
    });
    expect(s.batches.find((b) => b.code === 'B-2407')?.qty).toBe(3);
    expect(s.batches.find((b) => b.code === 'B-2411')?.qty).toBe(10);
    expect(s.events[0]).toEqual({
      kind: 'sale',
      channel: 'counter',
      batch: 'B-2407',
      cavity: 6, // cavities 0-5 already popped on a strip of 10
    });
  });

  it('moves to the next batch once the first is empty', () => {
    const s = sellN(createInitialState(), 5);
    expect(s.batches.find((b) => b.code === 'B-2407')?.qty).toBe(0);
    expect(s.sales[0].batch).toBe('B-2411');
    expect(fefoBatch(s.batches)?.code).toBe('B-2411');
  });

  it('records online and counter sales against the same stock', () => {
    let s = demoReducer(createInitialState(), {
      type: 'sell',
      channel: 'online',
    });
    s = demoReducer(s, { type: 'sell', channel: 'counter' });
    expect(totalStock(s)).toBe(12);
    expect(s.sales.map((l) => l.channel)).toEqual(['counter', 'online']);
  });

  it('keeps only the latest four sale lines', () => {
    const s = sellN(createInitialState(), 6);
    expect(s.sales).toHaveLength(4);
    expect(s.sales[0].id).toBe(6);
  });

  it('refuses to sell when nothing is left', () => {
    const empty = { ...createInitialState(), batches: [] };
    const s = demoReducer(empty, { type: 'sell', channel: 'online' });
    expect(s.events).toEqual([{ kind: 'out-of-stock', channel: 'online' }]);
    expect(s.sales).toHaveLength(0);
  });
});

describe('reorder loop', () => {
  it('suggests a reorder when stock reaches the reorder level', () => {
    const before = sellN(createInitialState(), 7); // 7 left
    expect(before.reorder).toBe('idle');
    const at = demoReducer(before, { type: 'sell', channel: 'counter' }); // 6 left
    expect(at.reorder).toBe('suggested');
    expect(at.events.map((e) => e.kind)).toEqual(['sale', 'reorder-suggested']);
  });

  it('only suggests once per cycle', () => {
    const s = sellN(createInitialState(), 9);
    expect(s.events.map((e) => e.kind)).toEqual(['sale']);
  });

  it('places, then receives, a delivery as a new later-expiry batch', () => {
    let s = sellN(createInitialState(), 8);
    s = demoReducer(s, { type: 'place-reorder' });
    expect(s.reorder).toBe('ordered');
    s = demoReducer(s, { type: 'receive-delivery' });
    expect(s.reorder).toBe('idle');
    expect(totalStock(s)).toBe(16);
    // the emptied strip is gone, the new one sorts last
    expect(s.batches.map((b) => b.code)).toEqual(['B-2411', 'B-2502']);
    expect(s.batches[1].expiry).toBe('08/28');
    expect(s.events).toEqual([{ kind: 'delivery-received', batch: 'B-2502' }]);
  });

  it('ignores reorder actions that are out of order', () => {
    const s0 = createInitialState();
    expect(demoReducer(s0, { type: 'place-reorder' }).reorder).toBe('idle');
    expect(demoReducer(s0, { type: 'receive-delivery' }).batches).toEqual(
      s0.batches,
    );
  });

  it('picks the cheapest connected supplier', () => {
    expect(cheapestSupplier(createInitialState().suppliers)?.name).toBe(
      'Indus Medical Supply',
    );
    expect(cheapestSupplier([])).toBeUndefined();
  });

  it('resets to the initial record', () => {
    const s = demoReducer(sellN(createInitialState(), 3), { type: 'reset' });
    expect(s).toEqual(createInitialState());
  });
});

describe('autoplay', () => {
  it('mixes counter and online sales while stock is healthy', () => {
    const s = createInitialState();
    expect(nextAutoplayAction(s, 0)).toEqual({
      type: 'sell',
      channel: 'counter',
    });
    expect(nextAutoplayAction(s, 2)).toEqual({
      type: 'sell',
      channel: 'online',
    });
  });

  it('never stalls: it places and receives reorders by itself', () => {
    let s = createInitialState();
    for (let step = 0; step < 60; step++) {
      s = demoReducer(s, nextAutoplayAction(s, step));
      expect(totalStock(s)).toBeGreaterThan(0);
    }
  });
});
