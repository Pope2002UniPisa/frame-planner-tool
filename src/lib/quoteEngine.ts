/**
 * quoteEngine.ts — Motore di preventivo a valle (modello additivo bidirezionale).
 *
 * Da una configurazione: netto acquisto (a monte) -> ricarico / posa / trasporto
 * -> IVA (split-rate 10/22 con regola dei "beni significativi") -> detrazione
 * fiscale -> prezzo lordo e prezzo "al netto del bonus".
 *
 * ⚠️ La regola dei beni significativi e le detrazioni sono parametriche e vanno
 * validate col commercialista prima della messa in produzione (Master List §13/§17).
 */

export const ORDINARY_VAT_RATE = 22;
export const REDUCED_VAT_RATE = 10;

export interface QuoteLineInput {
  description?: string;
  qty: number;
  unitNetPrice: number;          // netto acquisto unitario (a monte)
  markup?: number;               // ricarico sulla riga (€)
  vatRate?: number;              // aliquota riga (usata solo in modalità NON agevolata)
  isBeneSignificativo?: boolean; // es. infissi, caldaia
}

export interface QuoteInput {
  lines: QuoteLineInput[];
  posa?: number;                 // manodopera/posa (imponibile)
  trasporto?: number;
  markup?: number;               // ricarico globale aggiuntivo (imponibile)
  agevolata?: boolean;           // regime IVA agevolato (ristrutturazione)
  reducedRate?: number;          // default 10
  ordinaryRate?: number;         // default 22
  detrazione?: { percentage: number; cap?: number | null } | null;
}

export interface VatBucket { rate: number; base: number; vat: number; }

export interface QuoteResult {
  subtotalNet: number;      // netto acquisto puro (a monte)
  markupTotal: number;      // ricarico totale (righe + globale)
  posa: number;
  trasporto: number;
  taxableTotal: number;     // imponibile totale
  vatBreakdown: VatBucket[];
  vat10Base: number;
  vat22Base: number;
  vatAmount: number;
  totalGross: number;       // IVA inclusa
  detrazioneAmount: number;
  totalNetOfBonus: number;  // al netto del bonus
  lines: Array<QuoteLineInput & { lineTaxable: number }>;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeQuote(input: QuoteInput): QuoteResult {
  const reduced = input.reducedRate ?? REDUCED_VAT_RATE;
  const ordinary = input.ordinaryRate ?? ORDINARY_VAT_RATE;
  const posa = r2(input.posa ?? 0);
  const trasporto = r2(input.trasporto ?? 0);
  const globalMarkup = r2(input.markup ?? 0);

  const lines = input.lines.map(l => ({
    ...l,
    lineTaxable: r2(l.qty * l.unitNetPrice + (l.markup ?? 0)),
  }));

  const subtotalNet = r2(lines.reduce((s, l) => s + l.qty * l.unitNetPrice, 0));
  const markupTotal = r2(lines.reduce((s, l) => s + (l.markup ?? 0), 0) + globalMarkup);
  const restServices = r2(posa + trasporto + globalMarkup);

  let vatBreakdown: VatBucket[];

  if (input.agevolata) {
    // Regola beni significativi: il 10% si applica alla prestazione e al bene
    // significativo solo fino a concorrenza del valore della prestazione;
    // l'eccedenza del bene significativo va al 22%.
    const sig = r2(lines.filter(l => l.isBeneSignificativo).reduce((s, l) => s + l.lineTaxable, 0));
    const nonSig = r2(lines.filter(l => !l.isBeneSignificativo).reduce((s, l) => s + l.lineTaxable, 0));
    const rest = r2(nonSig + restServices);
    const base10 = r2(rest + Math.min(sig, rest));
    const base22 = r2(Math.max(0, sig - rest));
    vatBreakdown = [
      { rate: reduced, base: base10, vat: r2(base10 * reduced / 100) },
      { rate: ordinary, base: base22, vat: r2(base22 * ordinary / 100) },
    ].filter(b => b.base > 0);
  } else {
    // Per-riga: ogni riga alla sua aliquota; posa/trasporto/ricarico all'ordinaria.
    const byRate = new Map<number, number>();
    for (const l of lines) {
      const rate = l.vatRate ?? ordinary;
      byRate.set(rate, r2((byRate.get(rate) ?? 0) + l.lineTaxable));
    }
    if (restServices > 0) byRate.set(ordinary, r2((byRate.get(ordinary) ?? 0) + restServices));
    vatBreakdown = [...byRate.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rate, base]) => ({ rate, base, vat: r2(base * rate / 100) }));
  }

  const taxableTotal = r2(vatBreakdown.reduce((s, b) => s + b.base, 0));
  const vatAmount = r2(vatBreakdown.reduce((s, b) => s + b.vat, 0));
  const totalGross = r2(taxableTotal + vatAmount);
  const vat10Base = r2(vatBreakdown.filter(b => b.rate === reduced).reduce((s, b) => s + b.base, 0));
  const vat22Base = r2(vatBreakdown.filter(b => b.rate === ordinary).reduce((s, b) => s + b.base, 0));

  // Detrazione: sulla spesa sostenuta (IVA inclusa), entro l'eventuale massimale.
  let detrazioneAmount = 0;
  if (input.detrazione && input.detrazione.percentage > 0) {
    const cap = input.detrazione.cap ?? Infinity;
    const base = Math.min(totalGross, cap);
    detrazioneAmount = r2(base * input.detrazione.percentage / 100);
  }
  const totalNetOfBonus = r2(totalGross - detrazioneAmount);

  return {
    subtotalNet, markupTotal, posa, trasporto, taxableTotal,
    vatBreakdown, vat10Base, vat22Base, vatAmount, totalGross,
    detrazioneAmount, totalNetOfBonus, lines,
  };
}
