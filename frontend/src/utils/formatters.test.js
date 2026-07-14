import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatMoney,
  formatPercent
} from './formatters.js';

describe('formatters', () => {
  it('formats money in fr-CA', () => {
    const formatted = formatMoney(1234.5, 'CAD');
    expect(formatted).toMatch(/1[\s\u00a0]?234[,.]50/);
    expect(formatted).toMatch(/\$|CAD|C\$/);
  });

  it('formats invalid money as zero', () => {
    const formatted = formatMoney('not-a-number', 'CAD');
    expect(formatted).toMatch(/0[,.]00/);
  });

  it('formats dates in fr-CA', () => {
    expect(formatDate('2026-07-13')).toMatch(/2026/);
    expect(formatDate(null)).toBe('—');
    expect(formatDate('invalid')).toBe('—');
  });

  it('formats percents', () => {
    expect(formatPercent(12.5)).toMatch(/12[,.]5\s*%/);
    expect(formatPercent(null)).toMatch(/0\s*%/);
  });
});
