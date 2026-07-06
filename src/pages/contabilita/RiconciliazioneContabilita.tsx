import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatEuro } from '@/lib/format';
import { CheckCircle2, Upload } from 'lucide-react';
import {
  parseCsv, parseItalianAmount, parseDate, findPaymentCode, movementKey, guessColumn, type CsvTable,
} from '@/lib/reconcile';

interface Meas { id: string; payment_code: string | null; estimated_price: number | null; amount_paid: number | null; client_name: string | null; }
interface PreviewRow {
  idx: number; date: string | null; amount: number; causale: string;
  code: string | null; meas: Meas | null; selected: boolean;
}

export default function RiconciliazioneContabilita() {
  const { user } = useAuth();
  const [table, setTable] = useState<CsvTable | null>(null);
  const [map, setMap] = useState({ date: -1, amount: -1, causale: -1 });
  const [meas, setMeas] = useState<Meas[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('measurements').select('id,payment_code,estimated_price,amount_paid,client_name').eq('user_id', user.id)
      .then(({ data }) => setMeas((data as any[] ?? []) as Meas[]));
  }, [user]);

  const codeIndex = useMemo(() => {
    const s = new Set<string>();
    const byCode = new Map<string, Meas>();
    meas.forEach(m => { if (m.payment_code) { s.add(m.payment_code); byCode.set(m.payment_code, m); } });
    return { set: s, byCode };
  }, [meas]);

  const onFile = async (file: File) => {
    const text = await file.text();
    const t = parseCsv(text);
    if (!t.headers.length) { toast.error('CSV vuoto o illeggibile'); return; }
    setTable(t);
    setMap({ date: guessColumn(t.headers, 'date'), amount: guessColumn(t.headers, 'amount'), causale: guessColumn(t.headers, 'causale') });
  };

  const buildPreview = () => {
    if (!table) return;
    if (map.date < 0 || map.amount < 0 || map.causale < 0) { toast.error('Mappa le colonne Data, Importo e Causale'); return; }
    const pr: PreviewRow[] = table.rows.map((r, idx) => {
      const amount = parseItalianAmount(r[map.amount] ?? '');
      const causale = r[map.causale] ?? '';
      const code = findPaymentCode(causale, codeIndex.set);
      const meas = code ? codeIndex.byCode.get(code) ?? null : null;
      return {
        idx, date: parseDate(r[map.date] ?? ''), amount: Number.isNaN(amount) ? 0 : amount,
        causale, code, meas,
        selected: !!meas && amount > 0, // di default: solo accrediti abbinati
      };
    });
    setRows(pr);
  };

  const toggle = (idx: number) => setRows(rs => rs.map(r => r.idx === idx ? { ...r, selected: !r.selected } : r));

  const matchedCount = rows.filter(r => r.selected).length;

  const importAll = async () => {
    if (!user || !rows.length) return;
    setBusy(true);
    let imported = 0, reconciled = 0, dup = 0;
    // ricalcolo saldi in memoria per aggiornare amount_paid cumulativo
    const paidDelta = new Map<string, number>();
    try {
      for (const r of rows) {
        const extId = movementKey(r.date, r.amount, r.causale);
        const doReconcile = r.selected && r.meas && r.amount > 0;
        // 1) inserisci movimento (anti-dup via unique (dealer,source,external_id))
        const { data: mv, error: mvErr } = await supabase.from('bank_movements' as any).insert({
          dealer_id: user.id,
          movement_date: r.date ?? new Date().toISOString().slice(0, 10),
          amount: r.amount, causale: r.causale, source: 'csv', external_id: extId,
          matched_code: r.code, status: doReconcile ? 'abbinato' : (r.code ? 'da_abbinare' : 'ignorato'),
        }).select('id').single();
        if (mvErr) {
          if ((mvErr as any).code === '23505') { dup++; continue; } // già importato
          throw mvErr;
        }
        imported++;
        if (!doReconcile || !r.meas) continue;

        // 2) registra pagamento
        const { data: pay, error: payErr } = await supabase.from('payments').insert({
          measurement_id: r.meas.id, user_id: user.id, amount: r.amount,
          payment_method: 'bonifico', payment_date: r.date ?? new Date().toISOString().slice(0, 10),
          reference_number: r.code, notes: 'Riconciliazione estratto conto',
          invoice_number: `FT-${Date.now().toString(36).toUpperCase()}`,
        }).select('id').single();
        if (payErr) throw payErr;

        // 3) aggiorna saldo misurazione (cumulativo su questo import)
        const base = (Number(r.meas.amount_paid) || 0) + (paidDelta.get(r.meas.id) ?? 0);
        const newPaid = Math.round((base + r.amount) * 100) / 100;
        paidDelta.set(r.meas.id, (paidDelta.get(r.meas.id) ?? 0) + r.amount);
        const estimated = Number(r.meas.estimated_price) || 0;
        await supabase.from('measurements').update({
          amount_paid: newPaid,
          payment_status: newPaid >= estimated && estimated > 0 ? 'pagato' : 'parziale',
          payment_method: 'bonifico',
        }).eq('id', r.meas.id);

        await supabase.from('bank_movements' as any).update({ payment_id: (pay as any).id }).eq('id', (mv as any).id);
        reconciled++;
      }
      toast.success(`Import: ${imported} movimenti, ${reconciled} riconciliati${dup ? `, ${dup} già presenti` : ''}`);
      setRows([]); setTable(null); if (fileRef.current) fileRef.current.value = '';
      // ricarica misurazioni per saldi aggiornati
      const { data } = await supabase.from('measurements').select('id,payment_code,estimated_price,amount_paid,client_name').eq('user_id', user.id);
      setMeas((data as any[] ?? []) as Meas[]);
    } catch (e: any) {
      toast.error(e.message ?? 'Errore durante l\'import');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ContabilitaLayout>
      <Card>
        <CardHeader><CardTitle className="font-heading text-base">Riconciliazione incassi — import estratto conto</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Carica il CSV dell'estratto conto (home banking / PayPal). I movimenti con il <strong>codice pagamento</strong> nella causale vengono abbinati all'ordine e registrati come incasso. Predisposto per l'aggancio PSD2 in tempo reale.
          </p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Scegli file CSV</Button>

          {table && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['date', 'amount', 'causale'] as const).map(k => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs capitalize">{k === 'date' ? 'Colonna Data' : k === 'amount' ? 'Colonna Importo' : 'Colonna Causale'}</Label>
                  <Select value={String(map[k])} onValueChange={v => setMap(m => ({ ...m, [k]: Number(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Scegli colonna" /></SelectTrigger>
                    <SelectContent>
                      {table.headers.map((h, i) => <SelectItem key={i} value={String(i)}>{h || `Colonna ${i + 1}`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <div className="sm:col-span-3">
                <Button onClick={buildPreview} className="gap-2">Analizza {table.rows.length} righe</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-base">Anteprima — {matchedCount} da riconciliare</CardTitle>
            <Button onClick={importAll} disabled={busy || matchedCount === 0} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Importa e riconcilia
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-2"></th>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Importo</th>
                    <th className="py-2 pr-3">Causale</th>
                    <th className="py-2 pr-3">Abbinamento</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.idx} className="border-b border-border/40">
                      <td className="py-2 pr-2">
                        <input type="checkbox" checked={r.selected} disabled={!r.meas || r.amount <= 0} onChange={() => toggle(r.idx)} />
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{r.date ?? '—'}</td>
                      <td className={`py-2 pr-3 whitespace-nowrap font-medium ${r.amount < 0 ? 'text-muted-foreground' : ''}`}>{formatEuro(r.amount)}</td>
                      <td className="py-2 pr-3 max-w-[280px] truncate" title={r.causale}>{r.causale}</td>
                      <td className="py-2 pr-3">
                        {r.meas
                          ? <span className="text-green-600 dark:text-green-400">✓ {r.meas.client_name || 'Ordine'} <span className="text-muted-foreground">({r.code})</span></span>
                          : r.amount <= 0 ? <span className="text-muted-foreground">uscita</span>
                          : <span className="text-muted-foreground">nessun codice</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Vengono registrati solo gli accrediti abbinati e selezionati. I movimenti già importati (stesso CSV) sono ignorati automaticamente.</p>
          </CardContent>
        </Card>
      )}
    </ContabilitaLayout>
  );
}
