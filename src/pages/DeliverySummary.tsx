import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Truck, Search, Filter, Eye, MapPin, Clock, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import { productLabels, statusLabels } from '@/lib/constants';
import AppLayout from '@/components/AppLayout';
import { useNavigate } from 'react-router-dom';

function getDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivery = new Date(dateStr);
  delivery.setHours(0, 0, 0, 0);
  return Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyBadge(days: number | null) {
  if (days === null) return { label: 'Da definire', variant: 'outline' as const, icon: Clock };
  if (days < 0) return { label: `${Math.abs(days)}gg in ritardo`, variant: 'destructive' as const, icon: AlertTriangle };
  if (days === 0) return { label: 'Oggi', variant: 'destructive' as const, icon: AlertTriangle };
  if (days <= 3) return { label: `${days}gg`, variant: 'destructive' as const, icon: AlertTriangle };
  if (days <= 7) return { label: `${days}gg`, variant: 'default' as const, icon: Clock };
  if (days <= 14) return { label: `${days}gg`, variant: 'secondary' as const, icon: Clock };
  return { label: `${days}gg`, variant: 'outline' as const, icon: CheckCircle2 };
}

export default function DeliverySummary() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('measurements')
        .select('*')
        .in('status', ['quoted', 'ordered', 'completed'])
        .order('created_at', { ascending: false });
      setMeasurements(data || []);
      setLoadingData(false);
    };
    fetch();
  }, [user]);

  const filtered = useMemo(() => {
    return measurements.filter((m) => {
      if (searchText && !(m.client_name || '').toLowerCase().includes(searchText.toLowerCase()) && !(m.client_address || '').toLowerCase().includes(searchText.toLowerCase())) return false;
      if (productFilter !== 'all' && m.product_type !== productFilter) return false;
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;

      if (urgencyFilter !== 'all') {
        const days = getDaysRemaining(m.estimated_delivery_date);
        if (urgencyFilter === 'overdue' && (days === null || days >= 0)) return false;
        if (urgencyFilter === 'urgent' && (days === null || days < 0 || days > 7)) return false;
        if (urgencyFilter === 'scheduled' && days === null) return false;
        if (urgencyFilter === 'unscheduled' && days !== null) return false;
      }

      return true;
    });
  }, [measurements, searchText, urgencyFilter, productFilter, statusFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dA = getDaysRemaining(a.estimated_delivery_date);
      const dB = getDaysRemaining(b.estimated_delivery_date);
      if (dA === null && dB === null) return 0;
      if (dA === null) return 1;
      if (dB === null) return -1;
      return dA - dB;
    });
  }, [filtered]);

  const stats = useMemo(() => {
    let overdue = 0, urgent = 0, scheduled = 0, unscheduled = 0, delivered = 0;
    measurements.forEach((m) => {
      if (m.status === 'completed') { delivered++; return; }
      const days = getDaysRemaining(m.estimated_delivery_date);
      if (days === null) unscheduled++;
      else if (days < 0) overdue++;
      else if (days <= 7) urgent++;
      else scheduled++;
    });
    return { overdue, urgent, scheduled, unscheduled, delivered, total: measurements.length };
  }, [measurements]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <Truck className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, letterSpacing: '-0.02em' }}>Consegne</h1>
            <p className="text-sm text-muted-foreground">Monitora lo stato e le scadenze delle consegne</p>
          </div>
        </div>
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'In ritardo', value: stats.overdue, color: 'text-destructive', icon: AlertTriangle },
            { label: 'Urgenti (≤7gg)', value: stats.urgent, color: 'text-orange-500', icon: Clock },
            { label: 'Programmate', value: stats.scheduled, color: 'text-primary', icon: Package },
            { label: 'Da programmare', value: stats.unscheduled, color: 'text-muted-foreground', icon: Clock },
            { label: 'Consegnate', value: stats.delivered, color: 'text-green-600', icon: CheckCircle2 },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="py-3 px-4 text-center">
                <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
                <p className={`text-xl font-bold ${s.color}`} style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, letterSpacing: '-0.01em' }}>Filtri consegne</CardTitle>
            <CardDescription>Ordini ordinati per urgenza di consegna.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Cerca cliente o indirizzo..." className="pl-10" value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
              </div>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[170px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le urgenze</SelectItem>
                  <SelectItem value="overdue">In ritardo</SelectItem>
                  <SelectItem value="urgent">Urgenti (≤7gg)</SelectItem>
                  <SelectItem value="scheduled">Programmate</SelectItem>
                  <SelectItem value="unscheduled">Da programmare</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="quoted">Preventivate</SelectItem>
                  <SelectItem value="ordered">Ordinate</SelectItem>
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
            </div>
            {(searchText || urgencyFilter !== 'all' || statusFilter !== 'all' || productFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchText(''); setUrgencyFilter('all'); setStatusFilter('all'); setProductFilter('all'); }}>
                Cancella filtri
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Delivery list */}
        {loadingData ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Nessuna consegna corrisponde ai filtri selezionati.</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sorted.map((m: any) => {
              const days = getDaysRemaining(m.estimated_delivery_date);
              const urgency = getUrgencyBadge(days);
              const UrgencyIcon = urgency.icon;
              return (
                <Card key={m.id} className={days !== null && days < 0 ? 'border-destructive/40' : days !== null && days <= 3 ? 'border-orange-400/40' : ''}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant={urgency.variant} className="text-[10px] gap-1 shrink-0">
                          <UrgencyIcon className="h-3 w-3" />
                          {urgency.label}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground truncate">{m.client_name || 'Senza nome'}</span>
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">{productLabels[m.product_type] || m.product_type}</span>
                        <Badge variant={statusLabels[m.status]?.variant || 'default'} className="text-[9px]">{statusLabels[m.status]?.label || m.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {m.client_address && (
                          <span className="text-[10px] text-muted-foreground hidden md:flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {m.client_address.length > 25 ? m.client_address.slice(0, 25) + '…' : m.client_address}
                          </span>
                        )}
                        {m.estimated_delivery_date && (
                          <span className="text-[10px] text-muted-foreground">{new Date(m.estimated_delivery_date).toLocaleDateString('it-IT')}</span>
                        )}
                        {m.estimated_price > 0 && <span className="text-[10px] font-medium text-accent">€{Number(m.estimated_price).toLocaleString('it-IT')}</span>}
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/misurazione/${m.id}`)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {m.delivery_notes && (
                      <p className="mt-1 text-[10px] text-muted-foreground italic pl-1">📝 {m.delivery_notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Totale: {sorted.length} consegne visualizzate su {measurements.length}
        </p>
      </div>
    </AppLayout>
  );
}
