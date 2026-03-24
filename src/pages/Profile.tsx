import { useEffect, useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, User, BarChart3, FileText, Edit3, Send, Package, CheckCircle } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

const productLabels: Record<string, string> = {
  finestra: 'Finestra',
  porta_finestra: 'Porta Finestra',
  basculante: 'Basculante',
  zanzariera: 'Zanzariera',
  persiana: 'Persiana',
};

const LINE_COLORS: Record<string, string> = {
  Finestra: '#f97316',
  'Porta Finestra': '#3b82f6',
  Basculante: '#6366f1',
  Zanzariera: '#10b981',
  Persiana: '#f59e0b',
};

export default function Profile() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company_name: '', phone: '', email: '', client_code: '' });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: pData }, { data: mData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('measurements').select('*').order('created_at', { ascending: false }),
      ]);
      if (pData) {
        setProfile(pData);
        setForm({ company_name: pData.company_name || '', phone: pData.phone || '', email: pData.email || '', client_code: pData.client_code || '' });
      }
      setMeasurements(mData || []);
      setLoadingData(false);
    };
    fetchData();
  }, [user]);

  const stats = useMemo(() => ({
    total: measurements.length,
    drafts: measurements.filter(m => m.status === 'bozza').length,
    sent: measurements.filter(m => m.status === 'ricevuto' || m.status === 'submitted' || m.status === 'in_review').length,
    quoted: measurements.filter(m => m.status === 'quoted').length,
    completed: measurements.filter(m => m.status === 'completed' || m.status === 'ordered').length,
  }), [measurements]);

  const statusChartData = useMemo(() => [
    { name: 'Bozze', value: stats.drafts, color: '#94a3b8' },
    { name: 'Inviate', value: stats.sent, color: '#3b82f6' },
    { name: 'Preventivate', value: stats.quoted, color: '#f59e0b' },
    { name: 'Completate', value: stats.completed, color: '#10b981' },
  ].filter(d => d.value > 0), [stats]);

  const monthlyProductData = useMemo(() => {
    const months: Record<string, Record<string, number>> = {};
    measurements.forEach(m => {
      const d = new Date(m.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = productLabels[m.product_type] || m.product_type;
      if (!months[key]) months[key] = {};
      months[key][label] = (months[key][label] || 0) + 1;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([month, counts]) => ({ month, ...counts }));
  }, [measurements]);

  const productTypes = useMemo(() => {
    const s = new Set<string>();
    measurements.forEach(m => s.add(productLabels[m.product_type] || m.product_type));
    return Array.from(s);
  }, [measurements]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        company_name: form.company_name,
        phone: form.phone,
        email: form.email,
      }).eq('id', profile.id);
      if (error) throw error;
      toast.success('Profilo aggiornato!');
    } catch (err: any) {
      toast.error(err.message || 'Errore');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <User className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-bold font-heading text-foreground">Profilo Personale</h1>
        </div>
      </header>

      <main className="container max-w-5xl py-8 space-y-8">
        {/* Personal info */}
        <Card>
          <CardHeader><CardTitle className="font-heading">Dati Personali</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {loadingData ? (
              <div className="animate-pulse h-20 bg-muted rounded" />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ragione sociale</Label>
                    <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Codice cliente</Label>
                    <Input value={form.client_code} disabled className="bg-muted" />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" /> {saving ? 'Salvataggio...' : 'Salva modifiche'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { icon: FileText, label: 'Totale', value: stats.total },
            { icon: Edit3, label: 'Bozze', value: stats.drafts },
            { icon: Send, label: 'Inviate', value: stats.sent },
            { icon: Package, label: 'Preventivate', value: stats.quoted },
            { icon: CheckCircle, label: 'Completate', value: stats.completed },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-lg bg-muted p-2"><s.icon className="h-5 w-5 text-muted-foreground" /></div>
                <div>
                  <p className="text-2xl font-bold font-heading text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        {measurements.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Stato misurazioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Andamento per tipologia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyProductData}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    {productTypes.map(pt => (
                      <Line key={pt} type="monotone" dataKey={pt} stroke={LINE_COLORS[pt] || '#8884d8'} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
