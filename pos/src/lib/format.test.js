import { describe, it, expect } from 'vitest';
import { money, int, date, dateTime } from './format';

// Intl.NumberFormat separates the currency code from the amount with a
// non-breaking space (char 160); normalise it for stable assertions.
const NBSP = String.fromCharCode(160);
const norm = (s) => s.split(NBSP).join(' ');

describe('format helpers', () => {
  it('money formats PKR with no decimals and handles junk', () => {
    expect(norm(money(1234))).toBe('PKR 1,234');
    expect(norm(money('20'))).toBe('PKR 20');
    expect(norm(money(null))).toBe('PKR 0');
    expect(norm(money(undefined))).toBe('PKR 0');
  });

  it('int groups thousands', () => {
    expect(int(1000)).toBe('1,000');
    expect(int('98')).toBe('98');
    expect(int(null)).toBe('0');
  });

  it('date / dateTime return an em dash for empty input', () => {
    expect(date(null)).toBe('—');
    expect(dateTime(undefined)).toBe('—');
    expect(date('2026-09-06T00:00:00Z')).toMatch(/2026/);
  });
});
