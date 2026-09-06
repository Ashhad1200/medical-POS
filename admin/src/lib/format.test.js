import { describe, it, expect } from 'vitest';
import { money, int, date, dateTime } from './format';

const NBSP = String.fromCharCode(160);
const norm = (s) => s.split(NBSP).join(' ');

describe('format helpers', () => {
  it('money defaults to USD with no decimals', () => {
    expect(norm(money(1999))).toBe('$1,999');
    expect(norm(money(0))).toBe('$0');
    expect(norm(money(null))).toBe('$0');
  });

  it('int groups thousands, coerces junk to 0', () => {
    expect(int(12345)).toBe('12,345');
    expect(int(undefined)).toBe('0');
  });

  it('date / dateTime dash out empty input', () => {
    expect(date(undefined)).toBe('—');
    expect(dateTime(null)).toBe('—');
    expect(date('2027-01-01T00:00:00Z')).toMatch(/2027/);
  });
});
