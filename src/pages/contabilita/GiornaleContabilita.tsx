import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { formatEuro } from '@/lib/format';

interface Line { account_code: string; descr: string; dare: number; avere: number; sort_order: number; }
interface Entry { id: string; data: string; controparte: string; numero: string; tipo: string; intra_ue: boolean; journal_lines: Line[]; }

export default function GiornaleContabilita() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('journal_entries')
      .select('id,data,controparte,numero,tipo,intra_ue,journal_lines(account_code,descr,dare,avere,sort_order)')
      .eq('dealer_id', user.id).eq('stato', 'registrata').order('data', { ascending: false })
      .then(({ data }) => { setEntries((data as unknown as Entry[]) ?? []); setLoading(false); });
  }, [user]);

  const totDare = entries.reduce((s, e) => s + e.journal_lines.reduce((a, l) => a + Number(l.dare), 0), 0);
  const totAvere = entries.reduce((s, e) => s + e.journal_lines.reduce((a, l) => a + Number(l.avere), 0), 0);
  const quadra = Math.abs(totDare - totAvere) < 0.01;

  const exportCSV = () => {
    const sep = ';';
    const rows: string[] = ['Data;Fornitore/Cliente;Numero;Tipo;Conto;Descrizione;Dare;Avere'];
    for (const e of entries) {
      const lines = [...e.journal_lines].sort((a, b) => a.sort_order - b.sort_order);
      lines.forEach((l, i) => {
        const head = i === 0;
        rows.push([
          head ? e.data : '', head ? e.controparte : '', head ? e.numero : '', head ? e.tipo : '',
          l.account_code, l.descr,
          Number(l.dare) ? Number(l.dare).toFixed(2) : '', Number(l.avere) ? Number(l.avere).toFixed(2) : '',
        ].join(sep));
      });
    }
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `libro_giornale_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <ContabilitaLayout>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-sm">
          <span>Totale Dare <strong>{formatEuro(totDare)}</strong></span>
          <span>Totale Avere <strong>{formatEuro(totAvere)}</strong></span>
          <Badge variant={quadra ? 'default' : 'destructive'}>{quadra ? 'Quadra' : 'Non quadra'}</Badge>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV} disabled={!entries.length}>
          <Download className="h-4 w-4" /> Esporta CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded bg-muted" />)}</div>
          ) : entries.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nessuna registrazione. Importa le fatture per iniziare.</p>
          ) : (
            <div className="divide-y divide-border">
              {entries.map(e => (
                <div key={e.id} className="p-3">
                  <div className="flex items-center gap-2 mb-1.5 text-sm">
                    <span className="text-muted-foreground">{e.data}</span>
                    <span className="font-medium">{e.controparte}</span>
                    <span className="text-muted-foreground">n. {e.numero}</span>
                    <Badge variant="outline" className="text-[10px]">{e.tipo}</Badge>
                    {e.intra_ue && <Badge variant="secondary" className="text-[10px]">reverse charge</Badge>}
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {[...e.journal_lines].sort((a, b) => a.sort_order - b.sort_order).map((l, i) => (
                        <tr key={i} className="text-muted-foreground">
                          <td className="py-0.5 w-14 font-mono text-xs">{l.account_code}</td>
                          <td className="py-0.5">{l.descr}</td>
                          <td className="py-0.5 text-right w-28">{Number(l.dare) ? formatEuro(l.dare) : ''}</td>
                          <td className="py-0.5 text-right w-28">{Number(l.avere) ? formatEuro(l.avere) : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </ContabilitaLayout>
  );
}
