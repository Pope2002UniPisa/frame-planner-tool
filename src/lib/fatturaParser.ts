/**
 * fatturaParser.ts — Parser FatturaPA (XML) portato da parser_fattura.py.
 * Namespace-agnostic (naviga per localName). Gira nel browser via DOMParser.
 */
import type { ParsedInvoice } from './accounting';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Primo discendente per nome locale (ignora il namespace), scoped a `root`.
function el(root: Element | Document, name: string): Element | null {
  return root.getElementsByTagNameNS('*', name)[0] ?? null;
}
function all(root: Element | Document, name: string): Element[] {
  return Array.from(root.getElementsByTagNameNS('*', name));
}
function txt(root: Element | Document | null, name: string, def = ''): string {
  if (!root) return def;
  const e = el(root, name);
  return e?.textContent?.trim() ?? def;
}

export function parseFatturaXML(xml: string): ParsedInvoice {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('XML non valido');
  }
  const header = el(doc, 'FatturaElettronicaHeader');
  const body = el(doc, 'FatturaElettronicaBody');
  if (!header || !body) throw new Error('Non è una FatturaPA (header/body mancanti)');

  // Cedente/prestatore (fornitore)
  const cedente = el(header, 'CedentePrestatore');
  let fornitore = txt(cedente, 'Denominazione');
  if (!fornitore) {
    const nome = txt(cedente, 'Nome'), cognome = txt(cedente, 'Cognome');
    fornitore = `${nome} ${cognome}`.trim();
  }
  const paese_fornitore = txt(cedente, 'IdPaese', 'IT');
  const piva_fornitore = txt(cedente, 'IdCodice');

  // Cessionario (cliente)
  const cessionario = el(header, 'CessionarioCommittente');
  const cliente = txt(cessionario, 'Denominazione');

  // Documento
  const datiGen = el(body, 'DatiGeneraliDocumento');
  const tipo_doc = txt(datiGen, 'TipoDocumento', 'TD01');
  const data = txt(datiGen, 'Data');
  const numero = txt(datiGen, 'Numero');
  const totaleRaw = txt(datiGen, 'ImportoTotaleDocumento', '0');

  // Riepiloghi IVA: somma imponibile/imposta, raccoglie aliquote/nature
  let imponibile = 0, imposta = 0;
  const aliquote: number[] = [];
  const nature: string[] = [];
  for (const riep of all(body, 'DatiRiepilogo')) {
    imponibile += parseFloat(txt(riep, 'ImponibileImporto', '0')) || 0;
    imposta += parseFloat(txt(riep, 'Imposta', '0')) || 0;
    const al = txt(riep, 'AliquotaIVA');
    if (al) aliquote.push(parseFloat(al) || 0);
    const nat = txt(riep, 'Natura');
    if (nat) nature.push(nat);
  }
  imponibile = r2(imponibile);
  imposta = r2(imposta);
  let totale = r2(parseFloat(totaleRaw) || 0);
  if (!totale) totale = r2(imponibile + imposta);

  const descrizione = txt(el(body, 'DettaglioLinee'), 'Descrizione');

  // Intra-UE / reverse charge: paese ≠ IT OR natura che inizia per N3
  const intra_ue = paese_fornitore !== 'IT' || nature.some(n => n.startsWith('N3'));

  return {
    fornitore, paese_fornitore, piva_fornitore, cliente, tipo_doc, data, numero,
    imponibile, imposta, totale,
    aliquota: aliquote[0] ?? 0,
    natura: nature[0] ?? '',
    intra_ue, descrizione,
  };
}
