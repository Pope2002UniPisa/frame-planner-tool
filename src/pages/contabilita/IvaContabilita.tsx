import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatEuro } from '@/lib/format';

const monthRange = () => {
  const now = new Date();
  return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10), to: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10) };
};
const quarterRange = () => {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return { from: new Date(now.getFullYear(), q * 3, 1).toISOString().slice(0, 10), to: new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().slice(0, 10) };
};

export default function IvaContabilita() {
  const [range, setRange] = useState(monthRange());
  const [report, setReport] = useState<{ iva_credito: number; iva_debito: number; saldo: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_vat_report', { p_from: range.from, p_to: range.to });
    setLoading(false);
    if (error) { setReport(null); return; }
    const row = Array.isArray(data) ? data[0] : data;
    setReport(row ? { iva_credito: Number(row.iva_credito), iva_debito: Number(row.iva_debito), saldo: Number(row.saldo) } : { iva_credito: 0, iva_debito: 0, saldo: 0 });
  }, [range]);

  useEffect(() => { load(); }, [load]);

  return (
    <ContabilitaLayout>
      <Card>
        <CardHeader><CardTitle className="font-heading text-base">Prospetto IVA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1"><Label className="text-xs">Dal</Label><Input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} /></div>
            <div className="space-y-1"><Label className="text-xs">Al</Label><Input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} /></div>
            <Button variant="outline" size="sm" onClick={() => setRange(monthRange())}>Mese</Button>
            <Button variant="outline" size="sm" onClick={() => setRange(quarterRange())}>Trimestre</Button>
          </div>

          {loading ? (
            <div className="h-24 animate-pulse rounded bg-muted" />
          ) : report && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Kpi label="IVA a credito" value={formatEuro(report.iva_credito)} />
              <Kpi label="IVA a debito" value={formatEuro(report.iva_debito)} />
              <Kpi
                label={report.saldo >= 0 ? 'IVA da versare' : 'Credito IVA da riportare'}
                value={formatEuro(Math.abs(report.saldo))}
                accent
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Le registrazioni in reverse charge si compensano (IVA a credito = IVA a debito) e non incidono sul saldo.
          </p>
        </CardContent>
      </Card>
    </ContabilitaLayout>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-accent' : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
