/**
 * accounting.ts — Regole contabili portate 1:1 da contabilita_app (Python).
 * Partita doppia, reverse charge intra-UE, quadratura, motore di codifica.
 * Logica pura e testabile; il portale la usa scrivendo su Supabase sotto la
 * RLS del dealer (ogni rivenditore vede solo la propria contabilità).
 */

// Aliquota ordinaria italiana auto-applicata in reverse charge (come nel Python).
export const REVERSE_CHARGE_RATE = 22.0;

// Descrizioni piano conti (per le righe di giornale). Fonte: piano_conti.py (+70).
export const ACCOUNT_DESC: Record<string, string> = {
  '10': 'Immobilizzazioni materiali (cespiti)',
  '15': 'Crediti verso clienti',
  '18': 'IVA a credito',
  '20': 'Banca c/c',
  '21': 'Cassa',
  '40': 'Debiti verso fornitori',
  '45': 'IVA a debito',
  '48': 'Erario c/IVA (saldo da versare)',
  '60': 'Acquisto merci e materie prime',
  '61': 'Utenze (energia, gas, acqua)',
  '62': 'Carburante automezzi',
  '63': 'Manutenzione automezzi',
  '64': 'Manutenzione macchinari/impianti',
  '65': 'Servizi vari (consulenze, grafica, ecc.)',
  '66': 'Pasti e rappresentanza',
  '67': 'Affitti e locazioni',
  '68': 'Noleggi',
  '69': "Materiale d'ufficio e consumo",
  '70': 'Ammortamento imm. materiali',
  '80': 'Ricavi delle vendite e prestazioni',
};

export const descrizione = (code: string) => ACCOUNT_DESC[code] ?? `Conto ${code}`;

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface ParsedInvoice {
  fornitore: string;
  paese_fornitore: string;
  piva_fornitore: string;
  cliente: string;
  tipo_doc: string;
  data: string;       // YYYY-MM-DD
  numero: string;
  imponibile: number;
  imposta: number;
  totale: number;
  aliquota: number;
  natura: string;
  intra_ue: boolean;
  descrizione: string;
}

export interface JournalLine {
  account_code: string;
  descr: string;
  dare: number;
  avere: number;
}

/** Chiave anti-duplicato: piva|numero|data (come giornale.chiave_fattura). */
export function chiaveFattura(inv: Pick<ParsedInvoice, 'piva_fornitore' | 'numero' | 'data'>): string {
  return `${inv.piva_fornitore}|${inv.numero}|${inv.data}`;
}

/** Scrittura passiva IT: dare costo + dare 18 (IVA se >0) / avere 40 (totale). */
export function scritturaFatturaPassiva(inv: ParsedInvoice, contoCosto: string): JournalLine[] {
  if (inv.intra_ue) return scritturaReverseCharge(inv, contoCosto);
  const lines: JournalLine[] = [
    { account_code: contoCosto, descr: descrizione(contoCosto), dare: r2(inv.imponibile), avere: 0 },
  ];
  if (inv.imposta > 0) {
    lines.push({ account_code: '18', descr: 'IVA a credito', dare: r2(inv.imposta), avere: 0 });
  }
  lines.push({ account_code: '40', descr: 'Debiti verso fornitori', dare: 0, avere: r2(inv.totale) });
  return lines;
}

/**
 * Reverse charge intra-UE (es. Romania): il fornitore fattura senza IVA;
 * l'app autofattura il 22% italiano registrandolo insieme a credito (18) e a
 * debito (45) → effetto IVA netto zero. Aliquota hardcoded come nel Python.
 */
export function scritturaReverseCharge(inv: ParsedInvoice, contoCosto: string): JournalLine[] {
  const imp = r2(inv.imponibile);
  const ivaTeorica = r2(imp * REVERSE_CHARGE_RATE / 100);
  return [
    { account_code: contoCosto, descr: descrizione(contoCosto), dare: imp, avere: 0 },
    { account_code: '40', descr: 'Debiti verso fornitori (intra-UE)', dare: 0, avere: imp },
    { account_code: '18', descr: 'IVA a credito (reverse charge)', dare: ivaTeorica, avere: 0 },
    { account_code: '45', descr: 'IVA a debito (reverse charge)', dare: 0, avere: ivaTeorica },
  ];
}

/** Scrittura fattura attiva: dare 15 (totale) / avere 80 (imponibile) + avere 45 (IVA). */
export function scritturaFatturaAttiva(imponibile: number, iva: number): JournalLine[] {
  const imp = r2(imponibile), i = r2(iva), tot = r2(imp + i);
  const lines: JournalLine[] = [
    { account_code: '15', descr: 'Crediti verso clienti', dare: tot, avere: 0 },
    { account_code: '80', descr: 'Ricavi delle vendite e prestazioni', dare: 0, avere: imp },
  ];
  if (i > 0) lines.push({ account_code: '45', descr: 'IVA a debito', dare: 0, avere: i });
  return lines;
}

/** Verifica quadratura Dare = Avere (tolleranza 0,01 come verifica_quadratura). */
export function verificaQuadratura(lines: JournalLine[]): { ok: boolean; totDare: number; totAvere: number } {
  const totDare = r2(lines.reduce((s, l) => s + l.dare, 0));
  const totAvere = r2(lines.reduce((s, l) => s + l.avere, 0));
  return { ok: Math.abs(totDare - totAvere) < 0.01, totDare, totAvere };
}

// ─── Motore di codifica (motore_codifica.py) ─────────────────────────────────

export interface KeywordRule { keywords: string[]; account_code: string; priority: number; }
export interface CodingProposal { conto: string | null; motivo: string; certo: boolean; }

/**
 * Propone il conto costo di una fattura passiva.
 * 1) regola P.IVA appresa → automatico (certo). 2) keyword → proposta (non certo).
 * 3) nessun match → ignoto.
 */
export function proponiConto(
  inv: Pick<ParsedInvoice, 'piva_fornitore' | 'descrizione' | 'fornitore'>,
  codingRules: Record<string, string>,
  keywords: KeywordRule[],
): CodingProposal {
  const rule = codingRules[inv.piva_fornitore];
  if (rule) return { conto: rule, motivo: 'regola fornitore (appresa)', certo: true };

  const testo = `${inv.descrizione} ${inv.fornitore}`.toLowerCase();
  const ordered = [...keywords].sort((a, b) => a.priority - b.priority);
  for (const k of ordered) {
    if (k.keywords.some(kw => testo.includes(kw))) {
      return { conto: k.account_code, motivo: 'parola chiave riconosciuta', certo: false };
    }
  }
  return { conto: null, motivo: 'fornitore/voce sconosciuti', certo: false };
}

// ─── Ammortamenti (ammortamenti.py) ──────────────────────────────────────────

export interface Asset { descrizione: string; valore: number; anno_acquisto: number; perc_amm: number; }

/** Quota di ammortamento per l'anno target: primo anno dimezzato, cap sul residuo. */
export function quotaAmmortamento(asset: Asset, anno: number): number {
  let residuo = asset.valore;
  let quotaAnno = 0;
  for (let y = asset.anno_acquisto; y <= anno; y++) {
    let quota = r2(residuo * asset.perc_amm / 100);
    if (y === asset.anno_acquisto) quota = r2(quota / 2); // 50% primo anno (regola fiscale IT)
    quota = Math.min(quota, residuo);
    residuo = r2(Math.max(0, residuo - quota));
    if (y === anno) quotaAnno = quota;
  }
  return quotaAnno;
}
