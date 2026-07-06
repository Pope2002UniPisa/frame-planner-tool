import { describe, it, expect } from 'vitest';
import { buildOrderDocuments, scorporaIva } from './orderInvoices';
import { verificaQuadratura } from './accounting';

describe('scorporaIva', () => {
  it('scorpora il 22% da un lordo', () => {
    const { imponibile, iva } = scorporaIva(1220, 22);
    expect(imponibile).toBe(1000);
    expect(iva).toBe(220);
  });
});

describe('buildOrderDocuments — solo estimated_price (fallback lordo 22%)', () => {
  const docs = buildOrderDocuments({ estimatedPrice: 1220 });

  it('attiva: scorporo IVA dal lordo, scrittura quadra', () => {
    expect(docs.attiva.imponibile).toBe(1000);
    expect(docs.attiva.iva).toBe(220);
    expect(docs.attiva.totale).toBe(1220);
    expect(verificaQuadratura(docs.attiva.lines).ok).toBe(true);
  });

  it('passiva: senza costo produttore → incompleta, nessuna riga', () => {
    expect(docs.passiva.incompleta).toBe(true);
    expect(docs.passiva.lines).toHaveLength(0);
    expect(docs.passiva.totale).toBe(0);
  });
});

describe('buildOrderDocuments — con preventivo dettagliato', () => {
  const docs = buildOrderDocuments({
    estimatedPrice: 1220,
    quote: { taxableTotal: 1000, vatAmount: 130, purchaseNet: 600 },
  });

  it('attiva: usa lo split del preventivo (non lo scorporo)', () => {
    expect(docs.attiva.imponibile).toBe(1000);
    expect(docs.attiva.iva).toBe(130);
    expect(verificaQuadratura(docs.attiva.lines).ok).toBe(true);
  });

  it('passiva: netto acquisto + IVA 22% a credito, quadra', () => {
    expect(docs.passiva.incompleta).toBe(false);
    expect(docs.passiva.imponibile).toBe(600);
    expect(docs.passiva.iva).toBe(132);
    expect(docs.passiva.totale).toBe(732);
    expect(verificaQuadratura(docs.passiva.lines).ok).toBe(true);
  });

  it('margine rivenditore = vendita − acquisto', () => {
    expect(docs.attiva.imponibile - docs.passiva.imponibile).toBe(400);
  });
});

describe('buildOrderDocuments — produttore intra-UE (reverse charge)', () => {
  it('passiva reverse charge: IVA a credito e a debito uguali, effetto netto zero', () => {
    const docs = buildOrderDocuments({
      estimatedPrice: 1220,
      quote: { taxableTotal: 1000, vatAmount: 220, purchaseNet: 600 },
      purchaseIntraUe: true,
    });
    expect(verificaQuadratura(docs.passiva.lines).ok).toBe(true);
    const credito = docs.passiva.lines.find(l => l.account_code === '18')?.dare ?? 0;
    const debito = docs.passiva.lines.find(l => l.account_code === '45')?.avere ?? 0;
    expect(credito).toBe(debito);
  });
});
