import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { formatEuro } from '@/lib/format';
import { quotaAmmortamento, descrizione, verificaQuadratura, type Asset } from '@/lib/accounting';

interface AssetRow extends Asset { id: string; categoria: string | null; }

export default function CespitiContabilita() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [form, setForm] = useState({ descrizione: '', valore: '', anno_acquisto: String(new Date().getFullYear()), perc_amm: '20', categoria: '' });
  const [anno, setAnno] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('assets' as any).select('*').eq('dealer_id', user.id).order('anno_acquisto', { ascending: false });
    setAssets((data as unknown as AssetRow[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const addAsset = async () => {
    if (!user || !form.descrizione || !form.valore) { toast.error('Descrizione e valore obbligatori'); return; }
    const { error } = await supabase.from('assets' as any).insert({
      dealer_id: user.id, descrizione: form.descrizione, valore: Number(form.valore),
      anno_acquisto: Number(form.anno_acquisto), perc_amm: Number(form.perc_amm), categoria: form.categoria || null,
    });
    if (error) { toast.error(error.message); return; }
    setForm({ descrizione: '', valore: '', anno_acquisto: String(new Date().getFullYear()), perc_amm: '20', categoria: '' });
    toast.success('Cespite aggiunto');
    load();
  };

  const quotaTotale = assets.reduce((s, a) => s + quotaAmmortamento({ descrizione: a.descrizione, valore: Number(a.valore), anno_acquisto: a.anno_acquisto, perc_amm: Number(a.perc_amm) }, Number(anno)), 0);

  const registraAmmortamento = async () => {
    if (!user) return;
    const totale = Math.round(quotaTotale * 100) / 100;
    if (totale <= 0) { toast.error('Nessuna quota da registrare per l\'anno scelto'); return; }
    setBusy(true);
    const lines = [
      { account_code: '70', descr: descrizione('70'), dare: totale, avere: 0, sort_order: 0 },
      { account_code: '10', descr: 'Fondo ammortamento', dare: 0, avere: totale, sort_order: 1 },
    ];
    if (!verificaQuadratura(lines).ok) { setBusy(false); toast.error('Scrittura non quadra'); return; }
    const { data: entry, error } = await supabase.from('journal_entries' as any).insert({
      dealer_id: user.id, chiave: `AMM|${anno}`, data: `${anno}-12-31`, controparte: 'Ammortamenti',
      numero: '', tipo: 'movimento', mov_tipo: 'ammortamento', stato: 'registrata',
    }).select('id').single();
    if (error || !entry) { setBusy(false); toast.error(error?.message?.includes('duplicate') ? 'Ammortamento già registrato per questo anno' : (error?.message ?? 'Errore')); return; }
    await supabase.from('journal_lines' as any).insert(lines.map(l => ({ ...l, entry_id: (entry as any).id })));
    setBusy(false);
    toast.success(`Ammortamento ${anno} registrato: ${formatEuro(totale)}`);
  };

  return (
    <ContabilitaLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="font-heading text-base">Nuovo cespite</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Descrizione</Label><Input value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-xs">Valore €</Label><Input type="number" value={form.valore} onChange={e => setForm({ ...form, valore: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Anno acq.</Label><Input type="number" value={form.anno_acquisto} onChange={e => setForm({ ...form, anno_acquisto: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">% amm.</Label><Input type="number" value={form.perc_amm} onChange={e => setForm({ ...form, perc_amm: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Categoria</Label><Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} /></div>
            <Button onClick={addAsset}>Aggiungi cespite</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-heading text-base">Registra ammortamento</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-3">
              <div className="space-y-1"><Label className="text-xs">Anno</Label><Input type="number" value={anno} onChange={e => setAnno(e.target.value)} className="w-28" /></div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Quota totale {anno}</p>
                <p className="text-xl font-bold text-accent">{formatEuro(quotaTotale)}</p>
              </div>
            </div>
            <Button onClick={registraAmmortamento} disabled={busy || quotaTotale <= 0}>Registra in partita doppia (70 a 10)</Button>
            <p className="text-[11px] text-muted-foreground">Primo anno dimezzato (regola fiscale). Un solo ammortamento per anno.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-base">Cespiti</CardTitle></CardHeader>
        <CardContent>
          {assets.length === 0 ? <p className="text-sm text-muted-foreground">Nessun cespite.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Descrizione</TableHead><TableHead className="text-right">Valore</TableHead><TableHead className="text-right">Anno</TableHead><TableHead className="text-right">%</TableHead><TableHead className="text-right">Quota {anno}</TableHead></TableRow></TableHeader>
              <TableBody>
                {assets.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.descrizione}</TableCell>
                    <TableCell className="text-right">{formatEuro(a.valore)}</TableCell>
                    <TableCell className="text-right">{a.anno_acquisto}</TableCell>
                    <TableCell className="text-right">{Number(a.perc_amm)}%</TableCell>
                    <TableCell className="text-right">{formatEuro(quotaAmmortamento({ descrizione: a.descrizione, valore: Number(a.valore), anno_acquisto: a.anno_acquisto, perc_amm: Number(a.perc_amm) }, Number(anno)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </ContabilitaLayout>
  );
}
