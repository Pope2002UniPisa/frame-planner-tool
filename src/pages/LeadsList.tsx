import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Phone, Search, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import { LEAD_STATUSES, leadStatusLabels, leadSourceLabels } from '@/lib/constants';
import type { Lead } from '@/hooks/useDashboardQueries';

const emptyForm = () => ({
  name: '', email: '', phone: '', address: '', city: '',
  source: 'showroom', status: 'nuovo', estimated_value: '', next_action_at: '', notes: '',
});

export default function LeadsList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from('leads' as any)
        .select('*')
        .eq('dealer_id', user.id)
        .order('created_at', { ascending: false });
      if (error) toast.error(error.message);
      setLeads((data as unknown as Lead[]) ?? []);
      setLoading(false);
    };
    fetchLeads();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
      if (!q) return true;
      return [l.name, l.city, l.phone, l.email].some(v => (v ?? '').toLowerCase().includes(q));
    });
  }, [leads, search, sourceFilter]);

  const byStatus = (status: string) => filtered.filter(l => l.status === status);

  // Lead da richiamare oggi o in ritardo (non ancora chiusi)
  const toRecall = useMemo(() => {
    const now = new Date();
    return leads
      .filter(l => l.next_action_at && !['vinto', 'perso'].includes(l.status) && new Date(l.next_action_at) <= now)
      .sort((a, b) => new Date(a.next_action_at!).getTime() - new Date(b.next_action_at!).getTime());
  }, [leads]);

  const handleCreate = async () => {
    if (!user || !form.name.trim()) { toast.error('Il nome è obbligatorio'); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from('leads' as any)
      .insert({
        dealer_id: user.id,
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        city: form.city || null,
        source: form.source,
        status: form.status,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        next_action_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : null,
        notes: form.notes || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setLeads(prev => [data as unknown as Lead, ...prev]);
    setDialogOpen(false);
    setForm(emptyForm());
    toast.success('Lead creato');
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">Lead — pre-vendita</h1>
            <p className="text-sm text-muted-foreground">Pipeline dei contatti prima della vendita.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5"><Plus className="h-4 w-4" /> Nuovo lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nuovo lead</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="l-name">Nome *</Label>
                  <Input id="l-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="l-phone">Telefono</Label>
                  <Input id="l-phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="l-email">Email</Label>
                  <Input id="l-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="l-city">Città</Label>
                  <Input id="l-city" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="l-address">Indirizzo</Label>
                  <Input id="l-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Fonte</Label>
                  <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(leadSourceLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Stato</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{leadStatusLabels[s].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="l-value">Valore stimato (€)</Label>
                  <Input id="l-value" type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="l-recall">Promemoria richiamo</Label>
                  <Input id="l-recall" type="datetime-local" value={form.next_action_at} onChange={e => setForm({ ...form, next_action_at: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="l-notes">Note</Label>
                  <Textarea id="l-notes" rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={saving}>{saving ? 'Salvataggio…' : 'Crea lead'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Da richiamare oggi */}
        {toRecall.length > 0 && (
          <Card className="border-accent/40">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-accent" /> Da richiamare ({toRecall.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {toRecall.map(l => (
                <button key={l.id} onClick={() => navigate(`/dashboard/lead/${l.id}`)}
                  className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 bg-background hover:bg-muted transition-colors text-left">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground">{l.name}</span>
                    {l.city && <span className="text-xs text-muted-foreground ml-2">{l.city}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {l.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>}
                    <Badge variant="destructive" className="text-[10px]">{new Date(l.next_action_at!).toLocaleDateString('it-IT')}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filtri */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cerca nome, città, telefono…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le fonti</SelectItem>
              {Object.entries(leadSourceLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Pipeline kanban */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {LEAD_STATUSES.map(s => <div key={s} className="h-40 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {LEAD_STATUSES.map(status => {
              const items = byStatus(status);
              const cfg = leadStatusLabels[status];
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: cfg.color }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: cfg.color }} />{cfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[60px]">
                    {items.map(l => (
                      <button key={l.id} onClick={() => navigate(`/dashboard/lead/${l.id}`)}
                        className="w-full text-left rounded-lg border border-border bg-background p-2.5 hover:border-accent/50 transition-colors">
                        <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                        {l.city && <p className="text-xs text-muted-foreground truncate">{l.city}</p>}
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">{leadSourceLabels[l.source] ?? l.source}</span>
                          {l.estimated_value != null && l.estimated_value > 0 && (
                            <span className="text-xs font-medium text-accent">€{Number(l.estimated_value).toLocaleString('it-IT')}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
