import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEuro } from '@/lib/format';

interface Bal { account_code: string; description: string; type: string; tot_dare: number; tot_avere: number; }

export default function BilancioContabilita() {
  const { user } = useAuth();
  const [bal, setBal] = useState<Bal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('v_account_balances' as any).select('*').eq('dealer_id', user.id)
      .then(({ data }) => { setBal((data as unknown as Bal[]) ?? []); setLoading(false); });
  }, [user]);

  // Stato patrimoniale: ATTIVO (dare-avere), PASSIVO (avere-dare)
  // Conto economico: COSTO (dare-avere), RICAVO (avere-dare)
  const val = (b: Bal) => (['ATTIVO', 'COSTO'].includes(b.type) ? Number(b.tot_dare) - Number(b.tot_avere) : Number(b.tot_avere) - Number(b.tot_dare));
  const group = (types: string[]) => bal.filter(b => types.includes(b.type)).map(b => ({ ...b, v: val(b) })).filter(b => Math.abs(b.v) > 0.005);

  const attivo = group(['ATTIVO']);
  const passivo = group(['PASSIVO']);
  const costi = group(['COSTO']);
  const ricavi = group(['RICAVO']);
  const tot = (rows: { v: number }[]) => rows.reduce((s, r) => s + r.v, 0);
  const utile = tot(ricavi) - tot(costi);

  const Section = ({ title, rows, total, totalLabel }: { title: string; rows: { account_code: string; description: string; v: number }[]; total: number; totalLabel: string }) => (
    <Card>
      <CardHeader><CardTitle className="font-heading text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <tbody>
            {rows.length === 0 ? <tr><td className="text-muted-foreground py-1">—</td></tr> : rows.map(r => (
              <tr key={r.account_code} className="border-b border-border/50">
                <td className="py-1.5 font-mono text-xs w-14 text-muted-foreground">{r.account_code}</td>
                <td className="py-1.5">{r.description}</td>
                <td className="py-1.5 text-right">{formatEuro(r.v)}</td>
              </tr>
            ))}
            <tr className="font-bold"><td /><td className="py-2">{totalLabel}</td><td className="py-2 text-right">{formatEuro(total)}</td></tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  if (loading) return <ContabilitaLayout><div className="h-48 animate-pulse rounded-lg bg-muted" /></ContabilitaLayout>;

  return (
    <ContabilitaLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Stato Patrimoniale — Attivo" rows={attivo} total={tot(attivo)} totalLabel="Totale attivo" />
        <Section title="Stato Patrimoniale — Passivo" rows={passivo} total={tot(passivo)} totalLabel="Totale passivo" />
        <Section title="Conto Economico — Costi" rows={costi} total={tot(costi)} totalLabel="Totale costi" />
        <Section title="Conto Economico — Ricavi" rows={ricavi} total={tot(ricavi)} totalLabel="Totale ricavi" />
      </div>
      <Card className="border-accent/40">
        <CardContent className="p-4 flex items-center justify-between">
          <span className="font-heading font-semibold">Risultato d'esercizio (utile/perdita)</span>
          <span className={`text-xl font-bold ${utile >= 0 ? 'text-accent' : 'text-destructive'}`}>{formatEuro(utile)}</span>
        </CardContent>
      </Card>
    </ContabilitaLayout>
  );
}
