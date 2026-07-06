/**
 * Fase 3 — doppio ciclo ordine → fattura.
 * Un ordine genera DUE documenti contabili, in bozza:
 *  - Ciclo ATTIVO (vendita al cliente finale): da estimated_price (LORDO, IVA
 *    compresa, ricarico incluso) → scorporo IVA. Se c'è un preventivo dettagliato
 *    si usa il suo split imponibile/IVA 10-22 reale.
 *  - Ciclo PASSIVO (acquisto dal produttore): dal NETTO ACQUISTO (costo). Oggi
 *    disponibile solo dal preventivo dettagliato; in futuro dal listino digitale.
 *    Senza costo → passiva "in attesa costo" (incompleta), da completare dopo.
 * Il ricarico = differenza vendita − acquisto = margine del rivenditore.
 */
import { scritturaFatturaAttiva, scritturaFatturaPassiva, type JournalLine, type ParsedInvoice } from '@/lib/accounting';

export const DEFAULT_VAT_RATE = 22;
export const PURCHASE_COST_ACCOUNT = '60'; // Acquisto merci e materie prime

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface QuoteTotals {
  taxableTotal: number;   // imponibile vendita (dal preventivo)
  vatAmount: number;      // IVA vendita
  purchaseNet: number;    // netto acquisto = costo produttore (Σ unit_net_price × qty)
}

export interface BuildOrderInput {
  estimatedPrice: number;        // LORDO (IVA compresa), fallback vendita
  vatRate?: number;              // aliquota fallback (default 22)
  quote?: QuoteTotals | null;    // preventivo dettagliato, se presente
  purchaseIntraUe?: boolean;     // produttore intra-UE (reverse charge). Default: IT
}

export interface DocResult {
  imponibile: number;
  iva: number;
  totale: number;
  lines: JournalLine[];
  incompleta: boolean;
}

export interface OrderDocuments { attiva: DocResult; passiva: DocResult; }

/** Scorporo IVA da un prezzo lordo: imponibile = lordo / (1 + rate). */
export function scorporaIva(lordo: number, rate: number): { imponibile: number; iva: number } {
  const imponibile = r2(lordo / (1 + rate / 100));
  return { imponibile, iva: r2(lordo - imponibile) };
}

export function buildOrderDocuments(input: BuildOrderInput): OrderDocuments {
  const rate = input.vatRate ?? DEFAULT_VAT_RATE;

  // ── Ciclo attivo (vendita) ────────────────────────────────────────────────
  let attivaImp: number, attivaIva: number;
  if (input.quote && (input.quote.taxableTotal > 0 || input.quote.vatAmount > 0)) {
    attivaImp = r2(input.quote.taxableTotal);
    attivaIva = r2(input.quote.vatAmount);
  } else {
    const s = scorporaIva(Math.max(0, input.estimatedPrice), rate);
    attivaImp = s.imponibile;
    attivaIva = s.iva;
  }
  const attiva: DocResult = {
    imponibile: attivaImp, iva: attivaIva, totale: r2(attivaImp + attivaIva),
    lines: scritturaFatturaAttiva(attivaImp, attivaIva),
    incompleta: attivaImp <= 0,
  };

  // ── Ciclo passivo (acquisto produttore) ────────────────────────────────────
  const purchaseNet = r2(input.quote?.purchaseNet ?? 0);
  if (purchaseNet <= 0) {
    // Nessun costo noto (listino non ancora presente) → bozza in attesa costo.
    return { attiva, passiva: { imponibile: 0, iva: 0, totale: 0, lines: [], incompleta: true } };
  }
  const intraUe = !!input.purchaseIntraUe;
  const imposta = intraUe ? 0 : r2(purchaseNet * rate / 100);
  const inv: ParsedInvoice = {
    fornitore: 'Produttore', paese_fornitore: intraUe ? 'UE' : 'IT', piva_fornitore: '',
    cliente: '', tipo_doc: 'TD01', data: '', numero: '',
    imponibile: purchaseNet, imposta, totale: r2(purchaseNet + imposta),
    aliquota: rate, natura: '', intra_ue: intraUe, descrizione: 'Acquisto merci per ordine',
  };
  const passiva: DocResult = {
    imponibile: purchaseNet, iva: imposta, totale: r2(purchaseNet + imposta),
    lines: scritturaFatturaPassiva(inv, PURCHASE_COST_ACCOUNT),
    incompleta: false,
  };
  return { attiva, passiva };
}
