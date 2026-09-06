import { describe, it, expect } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('maps header aliases to canonical keys and reports unknown ones', () => {
    const { headers, rows, unknownHeaders } = parseCsv(
      'Product Name,Brand,Qty,Expiry Date,Notes\nPanadol,GSK,50,2029-01-01,x',
    );
    expect(headers).toEqual(['name', 'manufacturer', 'quantity', 'expiry_date']);
    expect(unknownHeaders).toEqual(['Notes']);
    expect(rows).toEqual([
      { name: 'Panadol', manufacturer: 'GSK', quantity: '50', expiry_date: '2029-01-01' },
    ]);
  });

  it('omits empty cells and skips blank lines', () => {
    const { rows } = parseCsv('name,manufacturer,cost_price\nA,Acme,\n\nB,Acme,5\n');
    expect(rows).toEqual([
      { name: 'A', manufacturer: 'Acme' },
      { name: 'B', manufacturer: 'Acme', cost_price: '5' },
    ]);
  });

  it('returns empty structures for empty input', () => {
    expect(parseCsv('')).toEqual({ headers: [], rows: [], unknownHeaders: [] });
  });
});
