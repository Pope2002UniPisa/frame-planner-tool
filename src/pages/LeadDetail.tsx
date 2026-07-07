import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, UserCheck, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import { LEAD_STATUSES, leadStatusLabels, leadSourceLabels, leadActivityLabels } from '@/lib/constants';
import type { Lead, LeadActivity } from '@/hooks/useDashboardQueries';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '',
    source: 'altro', status: 'nuovo', estimated_value: '', next_action_at: '', notes: '',
  });

  const [newActivity, setNewActivity] = useState('');
  const [newActivityType, setNewActivityType] = useState('nota');

  const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (!user || !id) return;
    const fetchAll = async () => {
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('dealer_id', user.id)
        .single();
      if (!leadData) { setLoading(false); return; }
      const l = leadData as unknown as Lead;
      setLead(l);
      setForm({
        name: l.name ?? '', email: l.email ?? '', phone: l.phone ?? '',
        address: l.address ?? '', city: l.city ?? '', source: l.source ?? 'altro',
        status: l.status ?? 'nuovo',
        estimated_value: l.estimated_value != null ? String(l.estimated_value) : '',
        next_action_at: toLocalInput(l.next_action_at),
        notes: l.notes ?? '',
      });
      const { data: actData } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });
      setActivities((actData as unknown as LeadActivity[]) ?? []);
      setLoading(false);
    };
    fetchAll();
  }, [user, id]);

  const logActivity = async (type: string, note: string) => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('lead_activities')
      .insert({ lead_id: id, dealer_id: user.id, type, note, created_by: user.id })
      .select()
      .single();
    if (data) setActivities(prev => [data as unknown as LeadActivity, ...prev]);
  };

  const handleSave = async () => {
    if (!user || !id || !lead) return;
    setSaving(true);
    const statusChanged = form.status !== lead.status;
    const { error } = await supabase
      .from('leads')
      .update({
        name: form.name, email: form.email || null, phone: form.phone || null,
        address: form.address || null, city: form.city || null, source: form.source,
        status: form.status,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        next_action_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : null,
        notes: form.notes || null,
      })
      .eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (statusChanged) {
      await logActivity('cambio_stato', `${leadStatusLabels[lead.status]?.label ?? lead.status} → ${leadStatusLabels[form.status]?.label ?? form.status}`);
    }
    setLead(prev => prev ? { ...prev, ...form, estimated_value: form.estimated_value ? Number(form.estimated_value) : null } as Lead : prev);
    toast.success('Lead salvato');
  };

  const handleAddActivity = async () => {
    if (!newActivity.trim()) return;
    await logActivity(newActivityType, newActivity.trim());
    setNewActivity('');
    setNewActivityType('nota');
    toast.success('Attività aggiunta');
  };

  const handleConvert = async () => {
    if (!user || !id || !lead) return;
    if (lead.converted_client_id) { navigate(`/dashboard/clienti/${lead.converted_client_id}`); return; }
    setConverting(true);
    // Crea la scheda cliente (mirror di createClientRecord in ClientSummary)
    const { data: client, error: cErr } = await supabase
      .from('end_clients')
      .insert({
        dealer_id: user.id, name: lead.name,
        email: lead.email, phone: lead.phone, address: lead.address, city: lead.city,
        notes: lead.notes,
      })
      .select()
      .single();
    if (cErr || !client) { setConverting(false); toast.error(cErr?.message ?? 'Errore'); return; }
    await supabase.from('leads').update({ converted_client_id: client.id, status: 'vinto' }).eq('id', id);
    await logActivity('cambio_stato', 'Convertito in cliente');
    setConverting(false);
    toast.success('Lead convertito in cliente');
    navigate(`/dashboard/clienti/${client.id}`);
  };

  if (loading) return <AppLayout><div className="p-6 max-w-3xl mx-auto space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div></AppLayout>;
  if (!lead) return <AppLayout><div className="p-6 text-center text-muted-foreground">Lead non trovato.</div></AppLayout>;

  const cfg = leadStatusLabels[lead.status];

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard/lead')}>
            <ArrowLeft className="h-4 w-4" /> Lead
          </Button>
          <h1 className="text-xl font-bold font-heading text-foreground">{lead.name}</h1>
          <Badge variant={cfg?.variant ?? 'default'}>{cfg?.label ?? lead.status}</Badge>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleConvert} disabled={converting}>
              <UserCheck className="h-4 w-4" /> {lead.converted_client_id ? 'Vedi cliente' : 'Converti in cliente'}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="font-heading">Dati lead</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Telefono</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Città</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
              <div className="sm:col-span-2 space-y-1.5"><Label>Indirizzo</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Fonte</Label>
                <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(leadSourceLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stato</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEAD_STATUSES.map(s => <SelectItem key={s} value={s}>{leadStatusLabels[s].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Valore stimato (€)</Label><Input type="number" value={form.estimated_value} onChange={e => setForm({ ...form, estimated_value: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Promemoria richiamo</Label><Input type="datetime-local" value={form.next_action_at} onChange={e => setForm({ ...form, next_action_at: e.target.value })} /></div>
              <div className="sm:col-span-2 space-y-1.5"><Label>Note</Label><Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva modifiche'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-heading">Attività</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="w-36 space-y-1.5">
                <Label>Tipo</Label>
                <Select value={newActivityType} onValueChange={setNewActivityType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(leadActivityLabels).filter(([v]) => v !== 'cambio_stato').map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Nota</Label>
                <Input value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="Es. Richiamato, interessato al preventivo" onKeyDown={e => { if (e.key === 'Enter') handleAddActivity(); }} />
              </div>
              <Button onClick={handleAddActivity} className="gap-1.5"><MessageSquarePlus className="h-4 w-4" /> Aggiungi</Button>
            </div>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna attività registrata.</p>
            ) : (
              <div className="space-y-2">
                {activities.map(a => (
                  <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border p-2.5 bg-background">
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{leadActivityLabels[a.type] ?? a.type}</Badge>
                    <span className="text-sm text-foreground flex-1">{a.note}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
