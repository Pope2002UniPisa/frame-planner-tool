import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatEuro } from '@/lib/format';
import { CheckCircle2, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { scritturaFatturaPassiva, type ParsedInvoice } from '@/lib/accounting';
import { DEFAULT_VAT_RATE, PURCHASE_COST_ACCOUNT } from '@/lib/orderInvoices';

interface Entry {
  id: string; tipo: string; controparte: string; numero: string; data: string;
  stato: string; incompleta: boolean; note: string | null; totale: number;
}

export default function OrdiniContabilita() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [costInput, setCostInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: es } = await supabase.from('journal_entries' as any)
      .select('id,tipo,controparte,numero,data,stato,incompleta,note')
      .eq('dealer_id', user.id).eq('origine', 'ordine')
      .order('created_at', { ascending: false });
    const list = (es as any[]) ?? [];
    const ids = list.map(e => e.id);
    const totals = new Map<string, number>();
    if (ids.length) {
      const { data: ls } = await supabase.from('journal_lines' as any).select('entry_id,dare').in('entry_id', ids);
      ((ls as any[]) ?? []).forEach(l => totals.set(l.entry_id, (totals.get(l.entry_id) ?? 0) + Number(l.dare || 0)));
    }
    setEntries(list.map(e => ({ ...e, totale: Math.round((totals.get(e.id) ?? 0) * 100) / 100 })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const conferma = async (e: Entry) => {
    if (!user) return;
    if (e.incompleta) { toast.error('Completa prima il costo produttore'); return; }
    setBusy(e.id);
    try {
      const patch: any = { stato: 'registrata' };
      // La fattura attiva prende il progressivo dell'anno alla conferma (non da bozza),
      // in modo atomico (niente numeri duplicati/saltati).
      if (e.tipo === 'attiva') {
        const anno = new Date(e.data).getFullYear();
        const { data: numero, error: numErr } = await supabase.rpc('next_invoice_number' as any, { p_anno: anno });
        if (numErr || numero == null) throw numErr ?? new Error('Numerazione non riuscita');
        patch.numero = String(numero);
      }
      const { error } = await supabase.from('journal_entries' as any).update(patch).eq('id', e.id);
      if (error) throw error;
      toast.success(`${e.tipo === 'attiva' ? 'Fattura attiva' : 'Fattura passiva'} registrata${patch.numero ? ` (n. ${patch.numero})` : ''}`);
      load();
    } catch (err: any) { toast.error(err.message ?? 'Errore'); } finally { setBusy(null); }
  };

  const elimina = async (e: Entry) => {
    if (!confirm('Eliminare questa bozza?')) return;
    setBusy(e.id);
    const { error } = await supabase.from('journal_entries' as any).delete().eq('id', e.id);
    if (error) toast.error(error.message); else { toast.success('Bozza eliminata'); load(); }
    setBusy(null);
  };

  const completaCosto = async (e: Entry) => {
    if (!user) return;
    const netto = Number((costInput[e.id] ?? '').replace(',', '.'));
    if (!netto || netto <= 0) { toast.error('Inserisci il netto acquisto'); return; }
    setBusy(e.id);
    try {
      const imposta = Math.round(netto * DEFAULT_VAT_RATE) / 100;
      const inv: ParsedInvoice = {
        fornitore: 'Produttore', paese_fornitore: 'IT', piva_fornitore: '', cliente: '',
        tipo_doc: 'TD01', data: e.data, numero: '', imponibile: netto, imposta,
        totale: Math.round((netto + imposta) * 100) / 100, aliquota: DEFAULT_VAT_RATE,
        natura: '', intra_ue: false, descrizione: 'Acquisto merci per ordine',
      };
      const lines = scritturaFatturaPassiva(inv, PURCHASE_COST_ACCOUNT);
      await supabase.from('journal_lines' as any).delete().eq('entry_id', e.id);
      const { error } = await supabase.from('journal_lines' as any).insert(
        lines.map((l, i) => ({ entry_id: e.id, account_code: l.account_code, descr: l.descr, dare: l.dare, avere: l.avere, sort_order: i })),
      );
      if (error) throw error;
      await supabase.from('journal_entries' as any).update({ incompleta: false, note: 'Fattura passiva da ordine (bozza) — costo inserito manualmente' }).eq('id', e.id);
      toast.success('Costo inserito');
      setCostInput(s => ({ ...s, [e.id]: '' }));
      load();
    } catch (err: any) { toast.error(err.message ?? 'Errore'); } finally { setBusy(null); }
  };

  const attive = entries.filter(e => e.tipo === 'attiva');
  const passive = entries.filter(e => e.tipo === 'passiva');

  const Section = ({ title, icon, list, cycle }: { title: string; icon: React.ReactNode; list: Entry[]; cycle: 'attivo' | 'passivo' }) => (
    <Card>
      <CardHeader><CardTitle className="font-heading text-base flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent>
        {list.length === 0
          ? <p className="text-sm text-muted-foreground">Nessuna bozza. Le fatture vengono generate quando una misurazione passa a “ordine”.</p>
          : (
            <div className="space-y-2">
              {list.map(e => (
                <div key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/40 py-2.5 text-sm">
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium">{e.controparte}</div>
                    <div className="text-xs text-muted-foreground">{new Date(e.data).toLocaleDateString('it-IT')}{e.numero ? ` · n. ${e.numero}` : ''}</div>
                  </div>
                  <div className="font-semibold whitespace-nowrap">{formatEuro(e.totale)}</div>
                  {e.stato === 'registrata'
                    ? <Badge className="bg-green-600 hover:bg-green-600">Registrata</Badge>
                    : e.incompleta
                      ? <Badge variant="outline" className="border-amber-500 text-amber-600">In attesa costo</Badge>
                      : <Badge variant="secondary">Bozza</Badge>}
                  <div className="flex items-center gap-2 ml-auto">
                    {cycle === 'passivo' && e.incompleta && e.stato !== 'registrata' && (
                      <div className="flex items-center gap-1">
                        <Input value={costInput[e.id] ?? ''} onChange={ev => setCostInput(s => ({ ...s, [e.id]: ev.target.value }))}
                          placeholder="Netto acquisto €" className="h-8 w-32" />
                        <Button size="sm" variant="outline" disabled={busy === e.id} onClick={() => completaCosto(e)}>Salva</Button>
                      </div>
                    )}
                    {e.stato !== 'registrata' && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1" disabled={busy === e.id || e.incompleta} onClick={() => conferma(e)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Conferma
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" disabled={busy === e.id} onClick={() => elimina(e)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );

  return (
    <ContabilitaLayout>
      <p className="text-sm text-muted-foreground">
        Ogni ordine genera due bozze: <strong>vendita</strong> al cliente finale (ciclo attivo) e <strong>acquisto</strong> dal produttore (ciclo passivo). Le bozze non entrano nel bilancio finché non le confermi.
      </p>
      {loading ? <p className="text-sm text-muted-foreground">Caricamento…</p> : (
        <>
          <Section title="Ciclo attivo — vendite (fatture attive)" icon={<ArrowUpCircle className="h-4 w-4 text-green-600" />} list={attive} cycle="attivo" />
          <Section title="Ciclo passivo — acquisti produttore (fatture passive)" icon={<ArrowDownCircle className="h-4 w-4 text-blue-600" />} list={passive} cycle="passivo" />
        </>
      )}
    </ContabilitaLayout>
  );
}
