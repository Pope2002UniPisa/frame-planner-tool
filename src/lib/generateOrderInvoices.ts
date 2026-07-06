/**
 * Genera le bozze contabili di un ordine (Fase 3, doppio ciclo).
 * Chiamato dopo il passaggio della misurazione a 'ordered'. Idempotente: se le
 * scritture da ordine esistono già per la misurazione, non fa nulla.
 * Le bozze restano fuori dal bilancio finché non vengono confermate
 * (v_account_balances filtra stato='registrata').
 */
import { supabase } from '@/integrations/supabase/client';
import { buildOrderDocuments, type QuoteTotals } from '@/lib/orderInvoices';
import type { JournalLine } from '@/lib/accounting';

export interface GenResult { created: boolean; note?: string }

export async function generateOrderInvoices(measurementId: string, userId: string): Promise<GenResult> {
  if (!measurementId || !userId) return { created: false, note: 'parametri mancanti' };

  // Idempotenza: già generate?
  const { data: existing } = await supabase
    .from('journal_entries' as any)
    .select('id').eq('measurement_id', measurementId).eq('origine', 'ordine').limit(1);
  if (existing && existing.length) return { created: false, note: 'già generate' };

  // Dati ordine
  const { data: m } = await supabase
    .from('measurements')
    .select('estimated_price,client_name')
    .eq('id', measurementId).single();
  if (!m) return { created: false, note: 'ordine non trovato' };

  // Preventivo dettagliato più recente (se esiste): imponibile/IVA vendita + netto acquisto
  const { data: q } = await supabase
    .from('dealer_quotes' as any)
    .select('taxable_base,vat_amount,subtotal_net')
    .eq('measurement_id', measurementId).eq('dealer_id', userId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();

  const quote: QuoteTotals | null = q
    ? { taxableTotal: Number((q as any).taxable_base) || 0, vatAmount: Number((q as any).vat_amount) || 0, purchaseNet: Number((q as any).subtotal_net) || 0 }
    : null;

  const docs = buildOrderDocuments({
    estimatedPrice: Number((m as any).estimated_price) || 0,
    quote,
    purchaseIntraUe: false, // produttori italiani (extra/intra-UE più avanti)
  });

  const today = new Date().toISOString().slice(0, 10);
  const clientName = (m as any).client_name || 'Cliente';

  const insertEntry = async (
    tipo: 'attiva' | 'passiva', controparte: string, lines: JournalLine[], incompleta: boolean, note: string,
  ) => {
    const { data: entry, error } = await supabase.from('journal_entries' as any).insert({
      dealer_id: userId,
      chiave: `ORD-${tipo.toUpperCase()}|${measurementId}`,
      data: today, controparte, numero: '', tipo,
      intra_ue: false, stato: 'bozza', origine: 'ordine',
      incompleta, measurement_id: measurementId, note,
    }).select('id').single();
    if (error) throw error;
    if (lines.length) {
      const { error: le } = await supabase.from('journal_lines' as any).insert(
        lines.map((l, i) => ({ entry_id: (entry as any).id, account_code: l.account_code, descr: l.descr, dare: l.dare, avere: l.avere, sort_order: i })),
      );
      if (le) throw le;
    }
    return (entry as any).id as string;
  };

  // Ciclo attivo (vendita)
  await insertEntry('attiva', clientName, docs.attiva.lines, docs.attiva.incompleta,
    'Fattura attiva da ordine (bozza) — da confermare prima del bilancio');

  // Ciclo passivo (acquisto produttore)
  await insertEntry('passiva', 'Produttore (da assegnare)', docs.passiva.lines, docs.passiva.incompleta,
    docs.passiva.incompleta
      ? 'In attesa costo produttore (listino) — completare prima di confermare'
      : 'Fattura passiva da ordine (bozza) — da confermare prima del bilancio');

  return { created: true };
}
