/**
 * Riconciliazione incassi — helper puri (testabili) per l'import dell'estratto
 * conto CSV. La logica: leggi il CSV → per ogni movimento in accredito cerca un
 * payment_code (10 cifre) nella causale → abbina all'ordine → registra pagamento.
 * Predisposto per PSD2: domani i movimenti arriveranno via API con lo stesso
 * modello (data, importo, causale) e passeranno dallo stesso matching.
 */

export interface CsvTable { headers: string[]; rows: string[][]; }

/** Parser CSV minimale con supporto a virgolette e delimitatore ; o ,. */
export function parseCsv(text: string): CsvTable {
  const clean = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
  if (!clean) return { headers: [], rows: [] };
  const firstLine = clean.slice(0, clean.indexOf('\n') >= 0 ? clean.indexOf('\n') : clean.length);
  const delim = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';

  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === delim) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };

  const lines = clean.split('\n').filter(l => l.trim() !== '');
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

/** "1.234,56" | "1234.56" | "-50,00" → number. Restituisce NaN se non numerico. */
export function parseItalianAmount(raw: string): number {
  if (raw == null) return NaN;
  let s = String(raw).trim().replace(/[€\s]/g, '');
  if (!s) return NaN;
  const neg = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, '').replace(/^-/, '');
  if (s.includes(',') && s.includes('.')) {
    // l'ultimo separatore è il decimale
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  if (Number.isNaN(n)) return NaN;
  return neg ? -n : n;
}

/** "07/07/2026" | "2026-07-07" | "07-07-2026" → "YYYY-MM-DD" (o null). */
export function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

/** Cerca nella causale un payment_code fra quelli noti (match esatto del codice). */
export function findPaymentCode(causale: string, knownCodes: Set<string>): string | null {
  if (!causale) return null;
  for (const token of causale.match(/\d{6,}/g) ?? []) {
    if (knownCodes.has(token)) return token;
  }
  return null;
}

/** Chiave anti-duplicato stabile di un movimento (per re-import dello stesso CSV). */
export function movementKey(date: string | null, amount: number, causale: string): string {
  return `${date ?? '?'}|${amount.toFixed(2)}|${(causale || '').slice(0, 80).toLowerCase()}`;
}

/** Indovina l'indice colonna dai nomi header più comuni dell'home banking IT. */
export function guessColumn(headers: string[], kind: 'date' | 'amount' | 'causale'): number {
  const pats: Record<typeof kind, RegExp> = {
    date: /data|date|valuta/i,
    amount: /importo|accredit|dare|avere|amount|entrate/i,
    causale: /causale|descriz|descript|note|riferiment/i,
  } as const;
  const idx = headers.findIndex(h => pats[kind].test(h));
  return idx >= 0 ? idx : -1;
}
