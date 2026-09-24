// Pure state machine behind the hero demo: one stock record (a product held in
// expiry-dated batches) that the counter, the online store and the reorder list
// all read from. No React in here so it can be unit-tested and replayed.

export type Channel = 'counter' | 'online';

export type Batch = {
  code: string;
  expiry: string; // 'MM/YY', as printed on the foil
  qty: number;
  capacity: number;
};

export type Supplier = {
  name: string;
  unitPrice: number;
  fillRate: number; // 0..1
};

export type SaleLine = {
  id: number;
  channel: Channel;
  batch: string;
  price: number;
};

export type ReorderStatus = 'idle' | 'suggested' | 'ordered';

export type DemoEvent =
  | { kind: 'sale'; channel: Channel; batch: string; cavity: number }
  | { kind: 'out-of-stock'; channel: Channel }
  | { kind: 'reorder-suggested' }
  | { kind: 'reorder-placed' }
  | { kind: 'delivery-received'; batch: string };

export type DemoState = {
  product: { name: string; price: number };
  batches: Batch[]; // kept sorted earliest expiry first
  reorderLevel: number;
  reorderQty: number;
  suppliers: Supplier[];
  reorder: ReorderStatus;
  sales: SaleLine[]; // newest first, capped
  nextSaleId: number;
  nextBatchSeq: number;
  events: DemoEvent[]; // what the last action changed, for the UI to animate
};

export type DemoAction =
  | { type: 'sell'; channel: Channel }
  | { type: 'place-reorder' }
  | { type: 'receive-delivery' }
  | { type: 'reset' };

const MAX_SALE_LINES = 4;

/** 'MM/YY' -> sortable number (YYMM). */
export function expiryKey(expiry: string): number {
  const [mm, yy] = expiry.split('/').map(Number);
  return yy * 100 + mm;
}

export function sortByExpiry(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => expiryKey(a.expiry) - expiryKey(b.expiry));
}

export function totalStock(state: Pick<DemoState, 'batches'>): number {
  return state.batches.reduce((sum, b) => sum + b.qty, 0);
}

/** The supplier a pharmacy would see first on the reorder screen. */
export function cheapestSupplier(suppliers: Supplier[]): Supplier | undefined {
  return [...suppliers].sort((a, b) => a.unitPrice - b.unitPrice)[0];
}

/** Earliest-expiring batch that still has stock (FEFO). */
export function fefoBatch(batches: Batch[]): Batch | undefined {
  return sortByExpiry(batches).find((b) => b.qty > 0);
}

/** Adds `months` to an 'MM/YY' expiry. */
export function addMonths(expiry: string, months: number): string {
  const [mm, yy] = expiry.split('/').map(Number);
  const index = yy * 12 + (mm - 1) + months;
  const nextYy = Math.floor(index / 12);
  const nextMm = (index % 12) + 1;
  return `${String(nextMm).padStart(2, '0')}/${String(nextYy).padStart(2, '0')}`;
}

export function createInitialState(): DemoState {
  return {
    product: { name: 'Paracetamol 500 mg', price: 42 },
    batches: [
      { code: 'B-2407', expiry: '03/27', qty: 4, capacity: 10 },
      { code: 'B-2411', expiry: '11/27', qty: 10, capacity: 10 },
    ],
    reorderLevel: 6,
    reorderQty: 10,
    suppliers: [
      { name: 'Indus Medical Supply', unitPrice: 33.5, fillRate: 0.98 },
      { name: 'Ravi Pharma Distribution', unitPrice: 34.2, fillRate: 0.94 },
      { name: 'Margalla Traders', unitPrice: 35, fillRate: 0.91 },
    ],
    reorder: 'idle',
    sales: [],
    nextSaleId: 1,
    nextBatchSeq: 2502,
    events: [],
  };
}

function sell(state: DemoState, channel: Channel): DemoState {
  const batch = fefoBatch(state.batches);
  if (!batch) {
    return { ...state, events: [{ kind: 'out-of-stock', channel }] };
  }

  // cavities pop in order, so the one leaving is the first still sealed
  const cavity = batch.capacity - batch.qty;
  const batches = state.batches.map((b) =>
    b.code === batch.code ? { ...b, qty: b.qty - 1 } : b,
  );

  const events: DemoEvent[] = [
    { kind: 'sale', channel, batch: batch.code, cavity },
  ];

  let reorder = state.reorder;
  if (reorder === 'idle' && totalStock({ batches }) <= state.reorderLevel) {
    reorder = 'suggested';
    events.push({ kind: 'reorder-suggested' });
  }

  const line: SaleLine = {
    id: state.nextSaleId,
    channel,
    batch: batch.code,
    price: state.product.price,
  };

  return {
    ...state,
    batches,
    reorder,
    sales: [line, ...state.sales].slice(0, MAX_SALE_LINES),
    nextSaleId: state.nextSaleId + 1,
    events,
  };
}

function receiveDelivery(state: DemoState): DemoState {
  const latest = sortByExpiry(state.batches).at(-1);
  const expiry = latest ? addMonths(latest.expiry, 9) : '12/27';
  const code = `B-${state.nextBatchSeq}`;
  const incoming: Batch = {
    code,
    expiry,
    qty: state.reorderQty,
    capacity: state.reorderQty,
  };
  // empty strips go back in the drawer; keep what still has stock
  const batches = sortByExpiry([
    ...state.batches.filter((b) => b.qty > 0),
    incoming,
  ]);
  return {
    ...state,
    batches,
    reorder: 'idle',
    nextBatchSeq: state.nextBatchSeq + 1,
    events: [{ kind: 'delivery-received', batch: code }],
  };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'sell':
      return sell(state, action.channel);
    case 'place-reorder':
      if (state.reorder !== 'suggested') return { ...state, events: [] };
      return {
        ...state,
        reorder: 'ordered',
        events: [{ kind: 'reorder-placed' }],
      };
    case 'receive-delivery':
      if (state.reorder !== 'ordered') return { ...state, events: [] };
      return receiveDelivery(state);
    case 'reset':
      return createInitialState();
    default:
      return state;
  }
}

/**
 * What the hero plays on its own while nobody is touching it. Picks the next
 * action from the current state so the loop never gets stuck.
 */
export function nextAutoplayAction(state: DemoState, step: number): DemoAction {
  if (state.reorder === 'suggested') return { type: 'place-reorder' };
  if (state.reorder === 'ordered') return { type: 'receive-delivery' };
  return { type: 'sell', channel: step % 3 === 2 ? 'online' : 'counter' };
}
