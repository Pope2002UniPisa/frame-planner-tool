import { describe, it, expect } from 'vitest';
import { parseCsv, parseItalianAmount, parseDate, findPaymentCode, guessColumn } from './reconcile';

describe('parseItalianAmount', () => {
  it('gestisce formato italiano e internazionale', () => {
    expect(parseItalianAmount('1.234,56')).toBe(1234.56);
    expect(parseItalianAmount('1234.56')).toBe(1234.56);
    expect(parseItalianAmount('-50,00')).toBe(-50);
    expect(parseItalianAmount('€ 732,00')).toBe(732);
    expect(parseItalianAmount('')).toBeNaN();
  });
});

describe('parseDate', () => {
  it('normalizza a YYYY-MM-DD', () => {
    expect(parseDate('07/07/2026')).toBe('2026-07-07');
    expect(parseDate('2026-7-7')).toBe('2026-07-07');
    expect(parseDate('7-7-2026')).toBe('2026-07-07');
    expect(parseDate('boh')).toBeNull();
  });
});

describe('parseCsv', () => {
  it('rileva il delimitatore ; e le virgolette', () => {
    const t = parseCsv('Data;Importo;Causale\n07/07/2026;1.220,00;"Bonifico ord. 1234567890"');
    expect(t.headers).toEqual(['Data', 'Importo', 'Causale']);
    expect(t.rows[0][2]).toBe('Bonifico ord. 1234567890');
  });
});

describe('findPaymentCode', () => {
  it('trova solo un codice noto nella causale', () => {
    const known = new Set(['1234567890']);
    expect(findPaymentCode('Pagamento ordine 1234567890 grazie', known)).toBe('1234567890');
    expect(findPaymentCode('Nessun codice qui 9999999999', known)).toBeNull();
  });
});

describe('guessColumn', () => {
  it('indovina le colonne dai nomi header comuni', () => {
    const h = ['Data valuta', 'Importo', 'Causale'];
    expect(guessColumn(h, 'date')).toBe(0);
    expect(guessColumn(h, 'amount')).toBe(1);
    expect(guessColumn(h, 'causale')).toBe(2);
  });
});
