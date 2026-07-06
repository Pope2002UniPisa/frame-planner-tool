import { describe, it, expect } from 'vitest';
import {
  scritturaFatturaPassiva, scritturaReverseCharge, scritturaFatturaAttiva,
  verificaQuadratura, proponiConto, chiaveFattura, quotaAmmortamento,
  type ParsedInvoice, type KeywordRule,
} from './accounting';

const base: ParsedInvoice = {
  fornitore: 'ACME Srl', paese_fornitore: 'IT', piva_fornitore: '12345678901',
  cliente: 'Pratelli', tipo_doc: 'TD01', data: '2026-03-10', numero: '55',
  imponibile: 1000, imposta: 220, totale: 1220, aliquota: 22, natura: '',
  intra_ue: false, descrizione: 'Fornitura merci',
};

describe('fattura passiva IT', () => {
  it('costo + IVA a credito / debiti fornitori, quadra', () => {
    const lines = scritturaFatturaPassiva({ ...base }, '60');
    expect(lines).toContainEqual({ account_code: '60', descr: expect.any(String), dare: 1000, avere: 0 });
    expect(lines).toContainEqual({ account_code: '18', descr: 'IVA a credito', dare: 220, avere: 0 });
    expect(lines).toContainEqual({ account_code: '40', descr: 'Debiti verso fornitori', dare: 0, avere: 1220 });
    expect(verificaQuadratura(lines).ok).toBe(true);
  });

  it('senza IVA (imposta 0) niente riga 18', () => {
    const lines = scritturaFatturaPassiva({ ...base, imposta: 0, totale: 1000 }, '61');
    expect(lines.find(l => l.account_code === '18')).toBeUndefined();
    expect(verificaQuadratura(lines).ok).toBe(true);
  });
});

describe('reverse charge intra-UE (Romania)', () => {
  const ro: ParsedInvoice = {
    ...base, paese_fornitore: 'RO', piva_fornitore: 'RO998877', imposta: 0,
    totale: 1000, aliquota: 0, natura: 'N3.2', intra_ue: true,
  };
  it('IVA a credito 18 = IVA a debito 45 (saldo zero) e quadra', () => {
    const lines = scritturaReverseCharge(ro, '60');
    const c18 = lines.find(l => l.account_code === '18')!;
    const c45 = lines.find(l => l.account_code === '45')!;
    expect(c18.dare).toBe(220);   // 1000 * 22%
    expect(c45.avere).toBe(220);
    expect(c18.dare - c45.avere).toBe(0); // effetto IVA netto zero
    const q = verificaQuadratura(lines);
    expect(q.ok).toBe(true);
    expect(q.totDare).toBe(1220);
    expect(q.totAvere).toBe(1220);
  });
  it('passiva instrada automaticamente al reverse charge se intra_ue', () => {
    const lines = scritturaFatturaPassiva(ro, '60');
    expect(lines.filter(l => l.account_code === '45')).toHaveLength(1);
  });
});

describe('fattura attiva', () => {
  it('crediti / ricavi + IVA a debito', () => {
    const lines = scritturaFatturaAttiva(2000, 440);
    expect(lines).toContainEqual({ account_code: '15', descr: expect.any(String), dare: 2440, avere: 0 });
    expect(lines).toContainEqual({ account_code: '80', descr: expect.any(String), dare: 0, avere: 2000 });
    expect(verificaQuadratura(lines).ok).toBe(true);
  });
});

describe('motore di codifica', () => {
  const keywords: KeywordRule[] = [
    { keywords: ['energia', 'enel'], account_code: '61', priority: 10 },
    { keywords: ['consulenza', 'servizi'], account_code: '65', priority: 100 },
  ];
  it('regola P.IVA appresa → automatico', () => {
    const p = proponiConto(base, { '12345678901': '60' }, keywords);
    expect(p).toEqual({ conto: '60', motivo: 'regola fornitore (appresa)', certo: true });
  });
  it('keyword → proposta non certa', () => {
    const p = proponiConto({ ...base, descrizione: 'Fattura ENEL energia' }, {}, keywords);
    expect(p.conto).toBe('61');
    expect(p.certo).toBe(false);
  });
  it('nessun match → ignoto', () => {
    const p = proponiConto({ ...base, descrizione: 'xyz', fornitore: 'zzz' }, {}, keywords);
    expect(p.conto).toBeNull();
  });
});

describe('chiave e ammortamenti', () => {
  it('chiave = piva|numero|data', () => {
    expect(chiaveFattura(base)).toBe('12345678901|55|2026-03-10');
  });
  it('quota primo anno dimezzata, poi piena sul residuo', () => {
    const asset = { descrizione: 'Furgone', valore: 1000, anno_acquisto: 2024, perc_amm: 20 };
    expect(quotaAmmortamento(asset, 2024)).toBe(100); // 200/2
    expect(quotaAmmortamento(asset, 2025)).toBe(180); // 900 * 20%
  });
});
