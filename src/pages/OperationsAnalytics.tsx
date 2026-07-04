import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, TrendingUp, Gauge } from 'lucide-react';
import { useOperationTimings } from '@/hooks/useDashboardQueries';
import { statusLabels } from '@/lib/constants';
import { formatDuration } from '@/lib/format';

const label = (s: string | null) => (s ? (statusLabels[s]?.label ?? s) : 'Inizio');

export default function OperationsAnalytics() {
  const { user } = useAuth();
  const { data: timings = [], isLoading } = useOperationTimings(user?.id);

  const sorted = useMemo(
    () => [...timings].sort((a, b) => (b.transitions - a.transitions)),
    [timings],
  );

  // Metriche chiave: mediana del tempo per arrivare a preventivo / ordine / completamento
  const medianTo = (to: string) => {
    const rows = timings.filter(t => t.to_status === to && t.median_seconds != null);
    if (rows.length === 0) return null;
    // media pesata sulle transizioni delle mediane disponibili verso quello stato
    const tot = rows.reduce((s, r) => s + r.transitions, 0);
    return rows.reduce((s, r) => s + (r.median_seconds ?? 0) * r.transitions, 0) / tot;
  };

  const kpis = [
    { label: 'Mediana → Preventivo', value: medianTo('quoted'), icon: TrendingUp },
    { label: 'Mediana → Ordine', value: medianTo('ordered'), icon: Gauge },
    { label: 'Mediana → Completata', value: medianTo('completed'), icon: Clock },
  ];

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold font-heading text-foreground">Tempi operativi</h1>
          <p className="text-sm text-muted-foreground">
            Mediane misurate sui tuoi passaggi di stato — il ritorno reale, non stimato.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {kpis.map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <k.icon className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">{k.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{formatDuration(k.value)}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="font-heading text-base">Dettaglio per transizione</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-9 animate-pulse rounded bg-muted" />)}</div>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ancora nessun dato: i tempi si accumulano automaticamente a ogni cambio di stato delle misurazioni.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Da</TableHead>
                    <TableHead>A</TableHead>
                    <TableHead className="text-right">N°</TableHead>
                    <TableHead className="text-right">Mediana</TableHead>
                    <TableHead className="text-right">Media</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((t, i) => (
                    <TableRow key={`${t.from_status}-${t.to_status}-${i}`}>
                      <TableCell className="text-muted-foreground">{label(t.from_status)}</TableCell>
                      <TableCell className="font-medium">{label(t.to_status)}</TableCell>
                      <TableCell className="text-right">{t.transitions}</TableCell>
                      <TableCell className="text-right font-semibold text-accent">{formatDuration(t.median_seconds)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatDuration(t.avg_seconds)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
