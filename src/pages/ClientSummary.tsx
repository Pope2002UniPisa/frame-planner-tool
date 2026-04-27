import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Filter, ChevronDown, ChevronUp, Eye, User, Calendar } from 'lucide-react';
import { productLabels, statusLabels } from '@/lib/constants';
import AppLayout from '@/components/AppLayout';

interface Appointment {
  id: string; date: string; type: string; title: string;
  time: string | null; location: string | null; description: string | null; color: string | null;
}

export default function ClientSummary() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [measurements, setMeasurements] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedClientName, setExpandedClientName] = useState<string | null>(null);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [{ data: mData }, { data: aData }] = await Promise.all([
        supabase.from('measurements').select('*').order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').gte('date', todayStr).order('date').order('time'),
      ]);
      setMeasurements(mData || []);
      setAppointments(aData || []);
      setLoadingData(false);
    };
    fetchAll();
  }, [user]);

  const filteredMeasurements = useMemo(() => {
    return measurements.filter((m) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'bozza' && m.status !== 'bozza') return false;
        if (statusFilter === 'inviata' && !['ricevuto', 'submitted', 'in_review'].includes(m.status)) return false;
        if (statusFilter === 'quoted' && m.status !== 'quoted') return false;
        if (statusFilter === 'completed' && !['completed', 'ordered'].includes(m.status)) return false;
      }

      if (productFilter !== 'all' && m.product_type !== productFilter) return false;

      if (paymentFilter !== 'all') {
        if (paymentFilter === 'paid' && m.payment_status !== 'pagato') return false;
        if (paymentFilter === 'unpaid' && m.payment_status === 'pagato') return false;
      }

      if (dateFrom && new Date(m.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(m.created_at) > new Date(`${dateTo}T23:59:59`)) return false;

      return true;
    });
  }, [measurements, statusFilter, productFilter, paymentFilter, dateFrom, dateTo]);

  const clientSummary = useMemo(() => {
    const map: Record<string, any> = {};

    filteredMeasurements.forEach((m) => {
      const name = (m.client_name || 'Senza nome').trim();
      if (searchText && !name.toLowerCase().includes(searchText.toLowerCase())) return;

      if (!map[name]) {
        map[name] = {
          name,
          total: 0,
          drafts: 0,
          sent: 0,
          quoted: 0,
          completed: 0,
          estimatedRevenue: 0,
          realizedRevenue: 0,
          collectedRevenue: 0,
          measurements: [],
        };
      }

      const c = map[name];
      c.total += 1;
      c.measurements.push(m);
      c.estimatedRevenue += Number(m.estimated_price) || 0;

      if (m.status === 'bozza') c.drafts += 1;
      else if (['ricevuto', 'submitted', 'in_review'].includes(m.status)) c.sent += 1;
      else if (m.status === 'quoted') c.quoted += 1;
      else if (['completed', 'ordered'].includes(m.status)) {
        c.completed += 1;
        c.realizedRevenue += Number(m.estimated_price) || 0;
        if (m.payment_status === 'pagato') {
          c.collectedRevenue += Number(m.amount_paid) || Number(m.estimated_price) || 0;
        }
      }
    });

    return Object.values(map).sort((a: any, b: any) => a.name.localeCompare(b.name, 'it'));
  }, [filteredMeasurements, searchText]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Users className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">Clienti</h1>
            <p className="text-sm text-muted-foreground">Riepilogo nominativi con andamento ordini e pagamenti</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Filtri riepilogo</CardTitle>
            <CardDescription>Lista nominativi in ordine alfabetico con andamento ordini e pagamenti.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Cerca nominativo..." className="pl-10" value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="bozza">Bozze</SelectItem>
                  <SelectItem value="inviata">Inviate</SelectItem>
                  <SelectItem value="quoted">Preventivate</SelectItem>
                  <SelectItem value="completed">Completate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i prodotti</SelectItem>
                  {Object.entries(productLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Pagamenti: tutti</SelectItem>
                  <SelectItem value="paid">Pagati</SelectItem>
                  <SelectItem value="unpaid">Da incassare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input type="date" className="w-[160px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className="text-sm text-muted-foreground">—</span>
              <Input type="date" className="w-[160px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              {(searchText || statusFilter !== 'all' || productFilter !== 'all' || paymentFilter !== 'all' || dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchText(''); setStatusFilter('all'); setProductFilter('all'); setPaymentFilter('all'); setDateFrom(''); setDateTo(''); }}>
                  Cancella filtri
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {loadingData ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : clientSummary.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Nessun nominativo corrisponde ai filtri selezionati.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {clientSummary.map((cs: any) => {
              const isExpanded = expandedClientName === cs.name;
              const clientAppts = appointments.filter(a =>
                a.title.toLowerCase().includes(cs.name.toLowerCase())
              );
              return (
                <Card key={cs.name} className={isExpanded ? 'ring-2 ring-primary/20' : ''}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedClientName(isExpanded ? null : cs.name)}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold text-sm text-foreground">{cs.name}</span>
                        <Badge variant="outline" className="text-[10px]">{cs.total} misurazioni</Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border space-y-3">
                        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                          {[
                            { label: 'Bozze', value: cs.drafts },
                            { label: 'Inviate', value: cs.sent },
                            { label: 'Preventivate', value: cs.quoted },
                            { label: 'Completate', value: cs.completed },
                            { label: 'Fatt. stimato', value: `€${Math.round(cs.estimatedRevenue).toLocaleString('it-IT')}` },
                            { label: 'Fatt. realizzato', value: `€${Math.round(cs.realizedRevenue).toLocaleString('it-IT')}` },
                            { label: 'Fatt. incassato', value: `€${Math.round(cs.collectedRevenue).toLocaleString('it-IT')}` },
                          ].map(st => (
                            <div key={st.label} className="rounded-lg bg-muted p-2 text-center">
                              <p className="text-xs font-bold text-foreground">{st.value}</p>
                              <p className="text-[9px] text-muted-foreground">{st.label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Prossime misurazioni dal calendario */}
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Calendar className="h-3.5 w-3.5 text-accent" />
                            <span className="text-xs font-semibold text-foreground">Prossime misurazioni</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">{clientAppts.length} appuntamenti</span>
                          </div>
                          {clientAppts.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">Nessun appuntamento programmato.</p>
                          ) : (
                            <div className="space-y-0">
                              {clientAppts.map(appt => {
                                const d = new Date(appt.date + 'T00:00:00');
                                return (
                                  <div key={appt.id} className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
                                    <div className="text-center shrink-0 w-7 pt-0.5">
                                      <p className="text-xs font-bold text-foreground leading-none">{d.getDate()}</p>
                                      <p className="text-[9px] text-muted-foreground uppercase">{d.toLocaleDateString('it-IT', { month: 'short' })}</p>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: appt.color || '#94a3b8' }} />
                                        <p className="text-xs font-medium text-foreground truncate">{appt.title}</p>
                                      </div>
                                      {appt.time && <p className="text-[10px] text-muted-foreground">🕐 {appt.time}</p>}
                                      {appt.location && <p className="text-[10px] text-muted-foreground truncate">📍 {appt.location}</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          {cs.measurements.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-2 bg-background">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-xs font-medium text-foreground">{productLabels[m.product_type] || m.product_type}</span>
                                <Badge variant={statusLabels[m.status]?.variant || 'default'} className="text-[9px]">{statusLabels[m.status]?.label || m.status}</Badge>
                                <span className="text-[10px] text-muted-foreground">{m.width_mm}×{m.height_mm}mm</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {m.estimated_price > 0 && <span className="text-[10px] font-medium text-accent">€{Number(m.estimated_price).toLocaleString('it-IT')}</span>}
                                {m.payment_status === 'pagato' && <span className="text-[10px]" role="img" aria-label="Pagato">💳</span>}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/misurazione/${m.id}`)}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString('it-IT')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
