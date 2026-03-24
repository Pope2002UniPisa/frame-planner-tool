import { useEffect, useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BarChart3, Newspaper, Camera, Users, Plus, Trash2, Edit3, Save, Shield, FileText, Send, Package, CheckCircle, Eye, UserCheck, UserX, Clock, Target, TrendingUp } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

const productLabels: Record<string, string> = {
  finestra: 'Finestra', porta_finestra: 'Porta Finestra', porta: 'Porta',
  basculante: 'Basculante', zanzariera: 'Zanzariera', persiana: 'Persiana',
};

const LINE_COLORS: Record<string, string> = {
  Finestra: '#3b82f6', 'Porta Finestra': '#8b5cf6', Porta: '#a855f7',
  Basculante: '#f97316', Zanzariera: '#10b981', Persiana: '#f59e0b',
};

const statusLabels: Record<string, string> = {
  bozza: 'Bozza', ricevuto: 'Inviata', submitted: 'Inviata',
  in_review: 'In revisione', quoted: 'Preventivata', ordered: 'Ordinata', completed: 'Completata',
};

const BRANDS = ['FerreroLegno SPA', 'AluK Group', 'Finstral SPA', 'Somfy Italia'];

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();

  const [measurements, setMeasurements] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [salesObjectives, setSalesObjectives] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // News form
  const [newsDialog, setNewsDialog] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);
  const [newsForm, setNewsForm] = useState({ title: '', summary: '', tag: 'Novità', image_url: '', link: '', social_link: '', published: true });

  // Portfolio form
  const [portfolioDialog, setPortfolioDialog] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ title: '', description: '', image_url: '', sort_order: 0 });
  const [clientFilter, setClientFilter] = useState<'all' | 'pending' | 'approved'>('all');

  // Sales objectives
  const [objectiveDialog, setObjectiveDialog] = useState(false);
  const [objForm, setObjForm] = useState({ user_id: '', product_type: '', brand: '', target_count: 0, target_amount: 0, period: 'monthly', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  useEffect(() => {
    if (!user || !isAdmin) return;
    const fetchAll = async () => {
      const [{ data: m }, { data: p }, { data: n }, { data: pf }, { data: so }] = await Promise.all([
        supabase.from('measurements').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('news').select('*').order('created_at', { ascending: false }),
        supabase.from('portfolio_images').select('*').order('sort_order', { ascending: true }),
        supabase.from('sales_objectives').select('*').order('created_at', { ascending: false }),
      ]);
      setMeasurements(m || []);
      setProfiles(p || []);
      setNews(n || []);
      setPortfolio(pf || []);
      setSalesObjectives(so || []);
      setLoadingData(false);
    };
    fetchAll();
  }, [user, isAdmin]);

  // Stats
  const stats = useMemo(() => {
    const nonDraft = measurements.filter(m => m.status !== 'bozza');
    const completed = measurements.filter(m => ['completed', 'ordered'].includes(m.status));
    const paidCompleted = completed.filter(m => m.payment_status === 'pagato');
    return {
      totalMeasurements: nonDraft.length,
      totalClients: profiles.length,
      drafts: measurements.filter(m => m.status === 'bozza').length,
      sent: measurements.filter(m => ['ricevuto', 'submitted', 'in_review'].includes(m.status)).length,
      quoted: measurements.filter(m => m.status === 'quoted').length,
      completed: completed.length,
      totalRevenue: nonDraft.reduce((s, m) => s + (Number(m.estimated_price) || 0), 0),
      realizedRevenue: completed.reduce((s, m) => s + (Number(m.estimated_price) || 0), 0),
      collectedRevenue: paidCompleted.reduce((s, m) => s + (Number(m.amount_paid) || Number(m.estimated_price) || 0), 0),
    };
  }, [measurements, profiles]);

  const statusChartData = useMemo(() => [
    { name: 'Bozze', value: stats.drafts, color: '#94a3b8' },
    { name: 'Inviate', value: stats.sent, color: '#3b82f6' },
    { name: 'Preventivate', value: stats.quoted, color: '#f59e0b' },
    { name: 'Completate', value: stats.completed, color: '#10b981' },
  ].filter(d => d.value > 0), [stats]);

  const monthlyData = useMemo(() => {
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

  // Client stats with objectives
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const clientStats = useMemo(() => {
    const map: Record<string, any> = {};
    profiles.forEach(p => {
      map[p.user_id] = {
        user_id: p.user_id, name: p.company_name || p.email, email: p.email, approved: p.approved,
        total: 0, drafts: 0, sent: 0, quoted: 0, completed: 0, revenue: 0,
        realizedRevenue: 0, collectedRevenue: 0,
        byProduct: {} as Record<string, number>,
      };
    });
    measurements.forEach(m => {
      if (!map[m.user_id]) return;
      map[m.user_id].total++;
      map[m.user_id].revenue += Number(m.estimated_price) || 0;
      const pt = productLabels[m.product_type] || m.product_type;
      map[m.user_id].byProduct[pt] = (map[m.user_id].byProduct[pt] || 0) + 1;
      if (m.status === 'bozza') map[m.user_id].drafts++;
      else if (['ricevuto', 'submitted', 'in_review'].includes(m.status)) map[m.user_id].sent++;
      else if (m.status === 'quoted') map[m.user_id].quoted++;
      else if (['completed', 'ordered'].includes(m.status)) {
        map[m.user_id].completed++;
        map[m.user_id].realizedRevenue += Number(m.estimated_price) || 0;
        if (m.payment_status === 'pagato') {
          map[m.user_id].collectedRevenue += Number(m.amount_paid) || Number(m.estimated_price) || 0;
        }
      }
    });
    return Object.values(map).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '', 'it'));
  }, [profiles, measurements]);

  const filteredClients = useMemo(() => {
    if (clientFilter === 'approved') return clientStats.filter((c: any) => c.approved);
    if (clientFilter === 'pending') return clientStats.filter((c: any) => !c.approved);
    return clientStats;
  }, [clientStats, clientFilter]);

  const pendingCount = useMemo(() => profiles.filter(p => !p.approved).length, [profiles]);

  // Objective progress per client
  const getObjectiveProgress = (userId: string) => {
    const objs = salesObjectives.filter((o: any) => o.user_id === userId);
    const clientMeasurements = measurements.filter(m => m.user_id === userId && m.status !== 'bozza');
    return objs.map((obj: any) => {
      const current = obj.product_type
        ? clientMeasurements.filter(m => m.product_type === obj.product_type).length
        : clientMeasurements.length;
      const currentAmount = obj.product_type
        ? clientMeasurements.filter(m => m.product_type === obj.product_type).reduce((s: number, m: any) => s + (Number(m.estimated_price) || 0), 0)
        : clientMeasurements.reduce((s: number, m: any) => s + (Number(m.estimated_price) || 0), 0);
      return {
        ...obj,
        currentCount: current,
        currentAmount,
        progressCount: obj.target_count > 0 ? Math.min(100, Math.round((current / obj.target_count) * 100)) : 0,
        progressAmount: obj.target_amount > 0 ? Math.min(100, Math.round((currentAmount / obj.target_amount) * 100)) : 0,
      };
    });
  };

  const handleApproveProfile = async (userId: string, approve: boolean) => {
    const { error } = await supabase.from('profiles').update({ approved: approve }).eq('user_id', userId);
    if (error) { toast.error(error.message); return; }
    setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, approved: approve } : p));
    toast.success(approve ? 'Profilo approvato!' : 'Profilo rifiutato');
  };

  // Sales objective CRUD
  const handleSaveObjective = async () => {
    try {
      const { data, error } = await supabase.from('sales_objectives').insert(objForm as any).select().single();
      if (error) throw error;
      setSalesObjectives(prev => [data, ...prev]);
      setObjectiveDialog(false);
      toast.success('Obiettivo di vendita creato!');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteObjective = async (id: string) => {
    const { error } = await supabase.from('sales_objectives').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setSalesObjectives(prev => prev.filter(o => o.id !== id));
    toast.success('Obiettivo eliminato');
  };

  // News CRUD
  const handleSaveNews = async () => {
    try {
      if (editingNews) {
        const { error } = await supabase.from('news').update(newsForm).eq('id', editingNews.id);
        if (error) throw error;
        setNews(prev => prev.map(n => n.id === editingNews.id ? { ...n, ...newsForm } : n));
        toast.success('News aggiornata!');
      } else {
        const { data, error } = await supabase.from('news').insert(newsForm).select().single();
        if (error) throw error;
        setNews(prev => [data, ...prev]);
        toast.success('News creata!');
      }
      setNewsDialog(false);
      setEditingNews(null);
      setNewsForm({ title: '', summary: '', tag: 'Novità', image_url: '', link: '', social_link: '', published: true });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteNews = async (id: string) => {
    const { error } = await supabase.from('news').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setNews(prev => prev.filter(n => n.id !== id));
    toast.success('News eliminata');
  };

  // Portfolio CRUD
  const handleSavePortfolio = async () => {
    try {
      const { data, error } = await supabase.from('portfolio_images').insert(portfolioForm).select().single();
      if (error) throw error;
      setPortfolio(prev => [...prev, data]);
      setPortfolioDialog(false);
      setPortfolioForm({ title: '', description: '', image_url: '', sort_order: 0 });
      toast.success('Immagine aggiunta!');
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeletePortfolio = async (id: string) => {
    const { error } = await supabase.from('portfolio_images').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setPortfolio(prev => prev.filter(p => p.id !== id));
    toast.success('Immagine eliminata');
  };

  const handlePortfolioImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const path = `portfolio/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('logos').upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
    setPortfolioForm(f => ({ ...f, image_url: publicUrl }));
  };

  const handleNewsImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const path = `news/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('logos').upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
    setNewsForm(f => ({ ...f, image_url: publicUrl }));
  };

  if (authLoading || adminLoading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <Shield className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-bold font-heading text-foreground">Pannello Amministrazione</h1>
        </div>
      </header>

      <main className="container max-w-7xl py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Panoramica</TabsTrigger>
            <TabsTrigger value="clients" className="gap-1.5 relative">
              <Users className="h-3.5 w-3.5" /> Clienti
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="objectives" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Obiettivi</TabsTrigger>
            <TabsTrigger value="news" className="gap-1.5"><Newspaper className="h-3.5 w-3.5" /> News</TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-1.5"><Camera className="h-3.5 w-3.5" /> Portfolio</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              {[
                { icon: Edit3, label: 'Bozze totali', value: stats.drafts },
                { icon: Send, label: 'Inviate', value: stats.sent },
                { icon: Package, label: 'Preventivate', value: stats.quoted },
                { icon: CheckCircle, label: 'Completate', value: stats.completed },
                { icon: TrendingUp, label: 'Fatt. stimato', value: `€${Math.round(stats.totalRevenue).toLocaleString('it-IT')}` },
                { icon: TrendingUp, label: 'Fatt. realizzato', value: `€${Math.round(stats.realizedRevenue).toLocaleString('it-IT')}` },
                { icon: TrendingUp, label: 'Fatt. incassato', value: `€${Math.round(stats.collectedRevenue).toLocaleString('it-IT')}` },
              ].map(s => (
                <Card key={s.label}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="rounded-lg bg-muted p-2"><s.icon className="h-5 w-5 text-muted-foreground" /></div>
                    <div>
                      <p className="text-lg font-bold font-heading text-foreground">{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {measurements.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-heading">Stato misurazioni globale</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                          {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground mt-1">Totale misurazioni: <span className="font-bold text-foreground">{stats.drafts + stats.sent + stats.quoted + stats.completed}</span></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-heading">Andamento per tipologia</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={monthlyData}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip /><Legend />
                        {productTypes.map(pt => (
                          <Line key={pt} type="monotone" dataKey={pt} stroke={LINE_COLORS[pt] || '#8884d8'} strokeWidth={2} dot={{ r: 3 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader><CardTitle className="text-sm font-heading">Ultime misurazioni ricevute</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {measurements.filter(m => m.status !== 'bozza').slice(0, 10).map(m => {
                    const profile = profiles.find(p => p.user_id === m.user_id);
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{productLabels[m.product_type] || m.product_type}</span>
                            <Badge variant="outline" className="text-[10px]">{statusLabels[m.status] || m.status}</Badge>
                            {m.order_group_id && <Badge variant="secondary" className="text-[10px]">📦 {m.order_item_index}/{m.order_total_items}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{m.client_name} • {m.client_address}</p>
                          <p className="text-[10px] text-muted-foreground">Cliente: {profile?.company_name || profile?.email || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.estimated_price > 0 && <span className="text-xs font-medium text-accent">€{Number(m.estimated_price).toLocaleString('it-IT')}</span>}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/misurazione/${m.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLIENTS */}
          <TabsContent value="clients" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Select value={clientFilter} onValueChange={(v: any) => setClientFilter(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i clienti</SelectItem>
                    <SelectItem value="approved">Approvati</SelectItem>
                    <SelectItem value="pending">In attesa di approvazione</SelectItem>
                  </SelectContent>
                </Select>
                {pendingCount > 0 && (
                  <Badge variant="destructive">{pendingCount} in attesa</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-medium">{filteredClients.length} clienti totali</p>
            </div>

            <div className="space-y-4">
              {filteredClients.map((c: any, i: number) => {
                const objProgress = getObjectiveProgress(c.user_id);
                const isExpanded = expandedClient === c.user_id;
                const clientMeasurements = measurements.filter(m => m.user_id === c.user_id && m.status !== 'bozza');
                return (
                  <Card key={i} className={`cursor-pointer transition-all ${!c.approved ? 'border-amber-300 dark:border-amber-700' : ''} ${isExpanded ? 'ring-2 ring-primary/30' : ''}`}>
                    <CardContent className="py-4 space-y-3" onClick={() => setExpandedClient(isExpanded ? null : c.user_id)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">{c.name}</p>
                            <Badge variant={c.approved ? 'secondary' : 'outline'} className="text-[10px]">
                              {c.approved ? '✅ Approvato' : '⏳ In attesa'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          {!c.approved && (
                            <>
                              <Button size="sm" variant="default" className="gap-1 h-7" onClick={() => handleApproveProfile(c.user_id, true)}>
                                <UserCheck className="h-3 w-3" /> Approva
                              </Button>
                              <Button size="sm" variant="destructive" className="gap-1 h-7" onClick={() => handleApproveProfile(c.user_id, false)}>
                                <UserX className="h-3 w-3" /> Rifiuta
                              </Button>
                            </>
                          )}
                          <Badge variant="secondary">{c.total} misurazioni</Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {[
                          { label: 'Bozze', value: c.drafts },
                          { label: 'Inviate', value: c.sent },
                          { label: 'Preventivate', value: c.quoted },
                          { label: 'Completate', value: c.completed },
                          { label: 'Fatt. stimato', value: `€${Math.round(c.revenue).toLocaleString('it-IT')}` },
                          { label: 'Fatt. realizzato', value: `€${Math.round(c.realizedRevenue).toLocaleString('it-IT')}` },
                          { label: 'Fatt. incassato', value: `€${Math.round(c.collectedRevenue).toLocaleString('it-IT')}` },
                        ].map(st => (
                          <div key={st.label} className="rounded-lg bg-muted p-2 text-center">
                            <p className="text-sm font-bold text-foreground">{st.value}</p>
                            <p className="text-[10px] text-muted-foreground">{st.label}</p>
                          </div>
                        ))}
                      </div>
                      {/* Product breakdown */}
                      {Object.keys(c.byProduct).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(c.byProduct).map(([pt, count]) => (
                            <Badge key={pt} variant="outline" className="text-[10px]">{pt}: {count as number}</Badge>
                          ))}
                        </div>
                      )}

                      {/* Expanded: show all measurements for this client */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-border space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">Misurazioni inviate ({clientMeasurements.length})</p>
                          {clientMeasurements.length === 0 && <p className="text-xs text-muted-foreground">Nessuna misurazione inviata</p>}
                          {clientMeasurements.map(m => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-2 bg-background" onClick={e => e.stopPropagation()}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-xs text-foreground">{productLabels[m.product_type] || m.product_type}</span>
                                  <Badge variant="outline" className="text-[9px]">{statusLabels[m.status] || m.status}</Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{m.client_name} • {m.client_address}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {m.estimated_price > 0 && <span className="text-xs font-medium text-accent">€{Number(m.estimated_price).toLocaleString('it-IT')}</span>}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/misurazione/${m.id}`)}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString('it-IT')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Objectives progress */}
                      {objProgress.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3" /> Obiettivi di vendita</p>
                          {objProgress.map((obj: any) => (
                            <div key={obj.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-foreground">
                                  {obj.product_type ? productLabels[obj.product_type] || obj.product_type : 'Generale'}
                                  {obj.brand ? ` — ${obj.brand}` : ''}
                                </span>
                                <span className="text-muted-foreground">
                                  {obj.target_count > 0 && `${obj.currentCount}/${obj.target_count} unità`}
                                  {obj.target_count > 0 && obj.target_amount > 0 && ' • '}
                                  {obj.target_amount > 0 && `€${Math.round(obj.currentAmount).toLocaleString('it-IT')}/€${Math.round(obj.target_amount).toLocaleString('it-IT')}`}
                                </span>
                              </div>
                              <Progress value={obj.target_count > 0 ? obj.progressCount : obj.progressAmount} className="h-2" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* OBJECTIVES */}
          <TabsContent value="objectives" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Target className="h-5 w-5 text-accent" />
                    Obiettivi di vendita
                  </CardTitle>
                  <Button size="sm" className="gap-1.5" onClick={() => {
                    setObjForm({ user_id: '', product_type: '', brand: '', target_count: 0, target_amount: 0, period: 'monthly', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
                    setObjectiveDialog(true);
                  }}>
                    <Plus className="h-3.5 w-3.5" /> Nuovo obiettivo
                  </Button>
                </div>
                <CardDescription>Definisci obiettivi per clienti, linee di prodotto o marchi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesObjectives.map((obj: any) => {
                    const clientProfile = profiles.find(p => p.user_id === obj.user_id);
                    const progress = getObjectiveProgress(obj.user_id).find((o: any) => o.id === obj.id);
                    return (
                      <div key={obj.id} className="rounded-xl border border-border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground text-sm">{clientProfile?.company_name || clientProfile?.email || 'Cliente'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {obj.product_type && <Badge variant="outline" className="text-[10px]">{productLabels[obj.product_type] || obj.product_type}</Badge>}
                              {obj.brand && <Badge variant="secondary" className="text-[10px]">{obj.brand}</Badge>}
                              <Badge variant="outline" className="text-[10px]">{obj.period === 'monthly' ? 'Mensile' : obj.period === 'quarterly' ? 'Trimestrale' : 'Annuale'}</Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteObjective(obj.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {progress && (
                          <div className="space-y-2 pt-1">
                            {obj.target_count > 0 && (
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Quantità: {progress.currentCount}/{obj.target_count}</span>
                                  <span className={progress.progressCount >= 100 ? 'text-green-600 font-bold' : 'text-muted-foreground'}>{progress.progressCount}%</span>
                                </div>
                                <Progress value={progress.progressCount} className="h-2" />
                              </div>
                            )}
                            {obj.target_amount > 0 && (
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span>Fatturato: €{Math.round(progress.currentAmount).toLocaleString('it-IT')}/€{Number(obj.target_amount).toLocaleString('it-IT')}</span>
                                  <span className={progress.progressAmount >= 100 ? 'text-green-600 font-bold' : 'text-muted-foreground'}>{progress.progressAmount}%</span>
                                </div>
                                <Progress value={progress.progressAmount} className="h-2" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {salesObjectives.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nessun obiettivo definito. Creane uno!</p>}
                </div>
              </CardContent>
            </Card>

            {/* KPI / Indici aziendali */}
            <BusinessIndicesCard measurements={measurements} />

            {/* Objective Dialog */}
            <Dialog open={objectiveDialog} onOpenChange={setObjectiveDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-heading">Nuovo obiettivo di vendita</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={objForm.user_id} onValueChange={v => setObjForm(f => ({ ...f, user_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleziona cliente..." /></SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => (
                          <SelectItem key={p.user_id} value={p.user_id}>{p.company_name || p.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Linea prodotto (opzionale)</Label>
                      <Select value={objForm.product_type} onValueChange={v => setObjForm(f => ({ ...f, product_type: v }))}>
                        <SelectTrigger><SelectValue placeholder="Tutti..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Tutti i prodotti</SelectItem>
                          {Object.entries(productLabels).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Marca (opzionale)</Label>
                      <Select value={objForm.brand} onValueChange={v => setObjForm(f => ({ ...f, brand: v }))}>
                        <SelectTrigger><SelectValue placeholder="Tutte..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Tutte le marche</SelectItem>
                          {BRANDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Obiettivo quantità</Label>
                      <Input type="number" value={objForm.target_count || ''} onChange={e => setObjForm(f => ({ ...f, target_count: parseInt(e.target.value) || 0 }))} placeholder="Es. 50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Obiettivo fatturato (€)</Label>
                      <Input type="number" value={objForm.target_amount || ''} onChange={e => setObjForm(f => ({ ...f, target_amount: parseFloat(e.target.value) || 0 }))} placeholder="Es. 25000" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Periodo</Label>
                      <Select value={objForm.period} onValueChange={v => setObjForm(f => ({ ...f, period: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensile</SelectItem>
                          <SelectItem value="quarterly">Trimestrale</SelectItem>
                          <SelectItem value="yearly">Annuale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Anno</Label>
                      <Input type="number" value={objForm.year} onChange={e => setObjForm(f => ({ ...f, year: parseInt(e.target.value) || 2026 }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Mese</Label>
                      <Input type="number" min={1} max={12} value={objForm.month || ''} onChange={e => setObjForm(f => ({ ...f, month: parseInt(e.target.value) || 0 }))} placeholder="1-12" />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveObjective} disabled={!objForm.user_id} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Salva</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* NEWS */}
          <TabsContent value="news" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading flex items-center gap-2"><Newspaper className="h-5 w-5 text-accent" /> Gestione News</CardTitle>
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingNews(null); setNewsForm({ title: '', summary: '', tag: 'Novità', image_url: '', link: '', social_link: '', published: true }); setNewsDialog(true); }}>
                    <Plus className="h-3.5 w-3.5" /> Nuova news
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {news.map(n => (
                    <div key={n.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px]">{n.tag}</Badge>
                          {!n.published && <Badge variant="outline" className="text-[10px]">Bozza</Badge>}
                        </div>
                        <p className="font-semibold text-sm text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{n.summary}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setEditingNews(n);
                          setNewsForm({ title: n.title, summary: n.summary, tag: n.tag, image_url: n.image_url || '', link: n.link || '', social_link: n.social_link || '', published: n.published });
                          setNewsDialog(true);
                        }}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteNews(n.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {news.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nessuna news ancora.</p>}
                </div>
              </CardContent>
            </Card>

            <Dialog open={newsDialog} onOpenChange={setNewsDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-heading">{editingNews ? 'Modifica news' : 'Nuova news'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Titolo</Label><Input value={newsForm.title} onChange={e => setNewsForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Riassunto</Label><Textarea value={newsForm.summary} onChange={e => setNewsForm(f => ({ ...f, summary: e.target.value }))} rows={3} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tag</Label>
                      <Select value={newsForm.tag} onValueChange={v => setNewsForm(f => ({ ...f, tag: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Novità">Novità</SelectItem>
                          <SelectItem value="Promozione">Promozione</SelectItem>
                          <SelectItem value="Agevolazione">Agevolazione</SelectItem>
                          <SelectItem value="Nuovo prodotto">Nuovo prodotto</SelectItem>
                          <SelectItem value="Evento">Evento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <Switch checked={newsForm.published} onCheckedChange={v => setNewsForm(f => ({ ...f, published: v }))} />
                      <Label className="text-sm">Pubblicata</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Immagine</Label>
                    <div className="flex gap-2">
                      <Input value={newsForm.image_url} onChange={e => setNewsForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL immagine o carica..." className="flex-1" />
                      <div>
                        <input type="file" accept="image/*" className="hidden" id="news-img-upload" onChange={handleNewsImageUpload} />
                        <Button variant="outline" size="sm" asChild><label htmlFor="news-img-upload" className="cursor-pointer">Carica</label></Button>
                      </div>
                    </div>
                    {newsForm.image_url && <img src={newsForm.image_url} alt="Preview" className="h-20 rounded-lg object-cover" />}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Link articolo</Label><Input value={newsForm.link} onChange={e => setNewsForm(f => ({ ...f, link: e.target.value }))} placeholder="https://..." /></div>
                    <div className="space-y-2"><Label>Link social</Label><Input value={newsForm.social_link} onChange={e => setNewsForm(f => ({ ...f, social_link: e.target.value }))} placeholder="https://instagram.com/..." /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={handleSaveNews} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Salva</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* PORTFOLIO */}
          <TabsContent value="portfolio" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading flex items-center gap-2"><Camera className="h-5 w-5 text-accent" /> Gestione Portfolio</CardTitle>
                  <Button size="sm" className="gap-1.5" onClick={() => { setPortfolioForm({ title: '', description: '', image_url: '', sort_order: 0 }); setPortfolioDialog(true); }}>
                    <Plus className="h-3.5 w-3.5" /> Aggiungi immagine
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {portfolio.map(img => (
                    <div key={img.id} className="rounded-xl border border-border overflow-hidden group relative">
                      <div className="aspect-square overflow-hidden">
                        <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{img.title}</p>
                        <p className="text-[10px] text-muted-foreground">{img.description}</p>
                      </div>
                      <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeletePortfolio(img.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {portfolio.length === 0 && <p className="col-span-4 text-sm text-muted-foreground text-center py-8">Nessuna immagine nel portfolio.</p>}
                </div>
              </CardContent>
            </Card>

            <Dialog open={portfolioDialog} onOpenChange={setPortfolioDialog}>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">Aggiungi immagine al portfolio</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Titolo</Label><Input value={portfolioForm.title} onChange={e => setPortfolioForm(f => ({ ...f, title: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Descrizione</Label><Input value={portfolioForm.description} onChange={e => setPortfolioForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div className="space-y-2">
                    <Label>Immagine</Label>
                    <div className="flex gap-2">
                      <Input value={portfolioForm.image_url} onChange={e => setPortfolioForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL o carica..." className="flex-1" />
                      <div>
                        <input type="file" accept="image/*" className="hidden" id="portfolio-img-upload" onChange={handlePortfolioImageUpload} />
                        <Button variant="outline" size="sm" asChild><label htmlFor="portfolio-img-upload" className="cursor-pointer">Carica</label></Button>
                      </div>
                    </div>
                    {portfolioForm.image_url && <img src={portfolioForm.image_url} alt="Preview" className="h-20 rounded-lg object-cover" />}
                  </div>
                </div>
                <DialogFooter><Button onClick={handleSavePortfolio} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Salva</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
