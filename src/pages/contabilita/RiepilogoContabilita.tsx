import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Card, CardContent } from '@/components/ui/card';
import { formatEuro } from '@/lib/format';

interface Bal { account_code: string; type: string; tot_dare: number; tot_avere: number; saldo: number; }

export default function RiepilogoContabilita() {
  const { user } = useAuth();
  const [bal, setBal] = useState<Bal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('v_account_balances').select('*').eq('dealer_id', user.id)
      .then(({ data }) => { setBal((data as unknown as Bal[]) ?? []); setLoading(false); });
  }, [user]);

  const sum = (codes: string[], mode: 'da' | 'av') =>
    bal.filter(b => codes.includes(b.account_code))
       .reduce((s, b) => s + (mode === 'da' ? Number(b.tot_dare) - Number(b.tot_avere) : Number(b.tot_avere) - Number(b.tot_dare)), 0);

  const ricavi = sum(['80'], 'av');
  const costi = sum(['60','61','62','63','64','65','66','67','68','69','70'], 'da');
  const ivaCredito = sum(['18'], 'da');
  const ivaDebito = sum(['45','48'], 'av');
  const ivaNetta = Math.max(ivaDebito - ivaCredito, 0);
  const crediti = sum(['15'], 'da');
  const debiti = sum(['40'], 'av');

  const kpis = [
    { label: 'Ricavi (complessivi)', value: ricavi, accent: true },
    { label: 'Costi (complessivi)', value: costi },
    { label: 'Margine', value: ricavi - costi, accent: true },
    { label: 'IVA netta a debito', value: ivaNetta },
    { label: 'Crediti v/clienti', value: crediti },
    { label: 'Debiti v/fornitori', value: debiti },
  ];

  return (
    <ContabilitaLayout>
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {kpis.map(k => (
            <Card key={k.label}><CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.accent ? 'text-accent' : 'text-foreground'}`}>{formatEuro(k.value)}</p>
            </CardContent></Card>
          ))}
        </div>
      )}
      {!loading && bal.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun dato contabile: importa le fatture per popolare il riepilogo.</p>
      )}
    </ContabilitaLayout>
  );
}
