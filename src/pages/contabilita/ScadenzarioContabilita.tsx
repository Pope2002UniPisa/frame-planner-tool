import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatEuro } from '@/lib/format';

interface Line { account_code: string; dare: number; avere: number; }
interface Entry { id: string; data: string; controparte: string; numero: string; tipo: string; journal_lines: Line[]; }

const statusOf = (delta: number) => delta < 0 ? { label: 'Scaduta', variant: 'destructive' as const }
  : delta <= 7 ? { label: 'In scadenza', variant: 'secondary' as const }
  : { label: 'Aperta', variant: 'outline' as const };

export default function ScadenzarioContabilita() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [giorni, setGiorni] = useState(30);

  useEffect(() => {
    if (!user) return;
    supabase.from('journal_entries' as any)
      .select('id,data,controparte,numero,tipo,journal_lines(account_code,dare,avere)')
      .eq('dealer_id', user.id).in('tipo', ['passiva', 'attiva']).order('data', { ascending: true })
      .then(({ data }) => setEntries((data as unknown as Entry[]) ?? []));
  }, [user]);

  const rows = useMemo(() => {
    const today = new Date();
    return entries.map(e => {
      const isPassiva = e.tipo === 'passiva';
      // Debito fornitori = avere su 40; Credito clienti = dare su 15
      const importo = isPassiva
        ? e.journal_lines.filter(l => l.account_code === '40').reduce((s, l) => s + Number(l.avere), 0)
        : e.journal_lines.filter(l => l.account_code === '15').reduce((s, l) => s + Number(l.dare), 0);
      const scad = new Date(e.data); scad.setDate(scad.getDate() + giorni);
      const delta = Math.ceil((scad.getTime() - today.getTime()) / 86400000);
      return { id: e.id, tipo: e.tipo, controparte: e.controparte, numero: e.numero, importo, scad: scad.toISOString().slice(0, 10), delta };
    }).filter(r => r.importo > 0).sort((a, b) => a.scad.localeCompare(b.scad));
  }, [entries, giorni]);

  const passive = rows.filter(r => r.tipo === 'passiva');
  const active = rows.filter(r => r.tipo === 'attiva');

  const List = ({ title, items }: { title: string; items: typeof rows }) => (
    <Card>
      <CardHeader><CardTitle className="font-heading text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">Nessuna scadenza.</p> : items.map(r => {
          const st = statusOf(r.delta);
          return (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-background">
              <div className="min-w-0"><span className="text-sm font-medium">{r.controparte}</span><span className="text-xs text-muted-foreground ml-2">n. {r.numero}</span></div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm">{formatEuro(r.importo)}</span>
                <span className="text-xs text-muted-foreground">{r.scad}</span>
                <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <ContabilitaLayout>
      <div className="flex items-end gap-3">
        <div className="space-y-1"><Label className="text-xs">Giorni di dilazione</Label><Input type="number" value={giorni} onChange={e => setGiorni(Number(e.target.value) || 0)} className="w-28" /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <List title="Scadenzario passivo (fornitori)" items={passive} />
        <List title="Scadenzario attivo (clienti)" items={active} />
      </div>
    </ContabilitaLayout>
  );
}
