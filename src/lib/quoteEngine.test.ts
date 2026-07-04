import { describe, it, expect } from 'vitest';
import { computeQuote } from './quoteEngine';

describe('computeQuote — regime ordinario (per riga)', () => {
  it('singola riga al 22%', () => {
    const q = computeQuote({ lines: [{ qty: 1, unitNetPrice: 1000, vatRate: 22 }] });
    expect(q.subtotalNet).toBe(1000);
    expect(q.taxableTotal).toBe(1000);
    expect(q.vatAmount).toBe(220);
    expect(q.totalGross).toBe(1220);
  });

  it('ricarico + posa + trasporto entrano nell\'imponibile', () => {
    const q = computeQuote({
      lines: [{ qty: 2, unitNetPrice: 500, markup: 100, vatRate: 22 }],
      posa: 300, trasporto: 50,
    });
    // riga imponibile = 2*500 + 100 = 1100; + posa/trasporto 350 all'ordinaria
    expect(q.taxableTotal).toBe(1450);
    expect(q.vatAmount).toBe(319); // 1450 * 0.22
    expect(q.markupTotal).toBe(100);
  });

  it('aliquote miste 10 e 22', () => {
    const q = computeQuote({ lines: [
      { qty: 1, unitNetPrice: 1000, vatRate: 10 },
      { qty: 1, unitNetPrice: 1000, vatRate: 22 },
    ] });
    expect(q.vat10Base).toBe(1000);
    expect(q.vat22Base).toBe(1000);
    expect(q.vatAmount).toBe(320); // 100 + 220
  });
});

describe('computeQuote — regime agevolato (beni significativi)', () => {
  it('il bene significativo eccedente la prestazione va al 22%', () => {
    // bene significativo 1000, prestazione (posa) 600
    const q = computeQuote({
      lines: [{ qty: 1, unitNetPrice: 1000, isBeneSignificativo: true }],
      posa: 600,
      agevolata: true,
    });
    // base10 = 600 + min(1000,600) = 1200; base22 = 400
    expect(q.vat10Base).toBe(1200);
    expect(q.vat22Base).toBe(400);
    expect(q.vatAmount).toBe(208); // 120 + 88
    expect(q.totalGross).toBe(1808);
  });

  it('se il bene non eccede la prestazione, tutto al 10%', () => {
    const q = computeQuote({
      lines: [{ qty: 1, unitNetPrice: 500, isBeneSignificativo: true }],
      posa: 800,
      agevolata: true,
    });
    // rest=800, sig=500 -> base10 = 800 + 500 = 1300; base22 = 0
    expect(q.vat10Base).toBe(1300);
    expect(q.vat22Base).toBe(0);
    expect(q.vatAmount).toBe(130);
  });
});

describe('computeQuote — detrazione', () => {
  it('detrazione 50% senza massimale', () => {
    const q = computeQuote({
      lines: [{ qty: 1, unitNetPrice: 1000, vatRate: 22 }],
      detrazione: { percentage: 50 },
    });
    // gross = 1220; detrazione 610; netto bonus 610
    expect(q.detrazioneAmount).toBe(610);
    expect(q.totalNetOfBonus).toBe(610);
  });

  it('detrazione con massimale che limita la base', () => {
    const q = computeQuote({
      lines: [{ qty: 1, unitNetPrice: 100000, vatRate: 22 }],
      detrazione: { percentage: 50, cap: 60000 },
    });
    // gross enorme, ma base detraibile = cap 60000 -> detrazione 30000
    expect(q.detrazioneAmount).toBe(30000);
  });
});
