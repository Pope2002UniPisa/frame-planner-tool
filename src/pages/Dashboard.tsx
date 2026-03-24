import { useEffect, useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, LogOut, Ruler, CheckCircle, FileText, Package, Send, Edit3, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  bozza: { label: 'Bozza', variant: 'outline' },
  ricevuto: { label: 'Inviata', variant: 'default' },
  submitted: { label: 'Inviata', variant: 'default' },
  in_review: { label: 'In revisione', variant: 'secondary' },
  quoted: { label: 'Preventivata', variant: 'outline' },
  ordered: { label: 'Ordinata', variant: 'default' },
  completed: { label: 'Completata', variant: 'secondary' },
};

const productLabels: Record<string, string> = {
  finestra: 'Finestra',
  porta_finestra: 'Porta Finestra',
  basculante: 'Basculante',
  zanzariera: 'Zanzariera',
  persiana: 'Persiana',
};

const CHART_COLORS = ['hsl(var(--accent))', 'hsl(var(--primary))', '#6366f1', '#f59e0b', '#10b981', '#ef4444'];

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: mData }, { data: pData }] = await Promise.all([
        supabase.from('measurements').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      ]);
      setMeasurements(mData || []);
      setProfile(pData);
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

  const productStats = useMemo(() => {
    const counts: Record<string, number> = {};
    measurements.forEach(m => {
      const label = productLabels[m.product_type] || m.product_type;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [measurements]);

  const statusChartData = useMemo(() => [
    { name: 'Bozze', value: stats.drafts, color: '#94a3b8' },
    { name: 'Inviate', value: stats.sent, color: '#3b82f6' },
    { name: 'Preventivate', value: stats.quoted, color: '#f59e0b' },
    { name: 'Completate', value: stats.completed, color: '#10b981' },
  ].filter(d => d.value > 0), [stats]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg gradient-accent p-2">
              <Ruler className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-heading text-foreground">Portale Misurazioni</h1>
              {profile && <p className="text-xs text-muted-foreground">{profile.company_name || user.email}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/nuova-misurazione">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Nuova Misurazione</span>
              </Button>
            </Link>
            <Button variant="outline" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Stats cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard icon={FileText} label="Totale" value={stats.total} />
          <StatCard icon={Edit3} label="Bozze" value={stats.drafts} />
          <StatCard icon={Send} label="Inviate" value={stats.sent} />
          <StatCard icon={Package} label="Preventivate" value={stats.quoted} />
          <StatCard icon={CheckCircle} label="Completate" value={stats.completed} />
        </div>

        {/* Charts */}
        {measurements.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Status pie chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Stato misurazioni
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      {statusChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product bar chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Per tipologia prodotto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={productStats}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Misurazioni" radius={[4, 4, 0, 0]}>
                      {productStats.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CTA */}
        <Card className="mb-8 gradient-primary border-0">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h2 className="text-xl font-bold font-heading text-primary-foreground">Inserisci una nuova misurazione</h2>
              <p className="mt-1 text-primary-foreground/70">Compila il form guidato per inviare le misure di finestre, porte, basculanti e altro.</p>
            </div>
            <Link to="/nuova-misurazione">
              <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-5 w-5" />
                Inizia ora
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Measurements list */}
        <div>
          <h2 className="mb-4 text-xl font-bold font-heading text-foreground">Le tue misurazioni</h2>
          {loadingData ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : measurements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ruler className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">Nessuna misurazione ancora. Inizia inserendone una!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {measurements.map(m => (
                <Card key={m.id} className="transition-shadow hover:shadow-card-hover">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="hidden rounded-lg bg-muted p-3 sm:block">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{productLabels[m.product_type] || m.product_type}</span>
                        <Badge variant={statusLabels[m.status]?.variant || 'default'}>
                          {statusLabels[m.status]?.label || m.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {m.width_mm}×{m.height_mm} mm • {m.client_name || 'Senza nome'}
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString('it-IT')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
