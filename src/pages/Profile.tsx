import { useEffect, useState, useMemo, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Save, User, BarChart3, FileText, Edit3, Send, Package, CheckCircle, Building2, Users, Upload, Phone, Mail, BookOpen, Download, AlertTriangle, CreditCard, RefreshCw, Euro, Target } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';

const productLabels: Record<string, string> = {
  finestra: 'Finestra', porta_finestra: 'Porta Finestra', porta: 'Porta',
  basculante: 'Basculante', zanzariera: 'Zanzariera', persiana: 'Persiana',
};

const LINE_COLORS: Record<string, string> = {
  Finestra: '#f97316', 'Porta Finestra': '#3b82f6', Porta: '#a855f7',
  Basculante: '#6366f1', Zanzariera: '#10b981', Persiana: '#f59e0b',
};

const SUPPLIERS = [
  { id: 'ferrerolegno', name: 'FerreroLegno SPA', category: 'Porte e finestre in legno', catalogs: ['Catalogo Porte 2026', 'Listino Prezzi Q1'] },
  { id: 'aluk', name: 'AluK Group', category: 'Sistemi in alluminio', catalogs: ['Catalogo Alluminio 2026', 'Soluzioni Scorrevoli'] },
  { id: 'finstral', name: 'Finstral SPA', category: 'Finestre e porte in PVC', catalogs: ['Catalogo PVC 2026', 'Innovazioni Termiche'] },
  { id: 'somfy', name: 'Somfy Italia', category: 'Motorizzazioni e domotica', catalogs: ['Catalogo Motori 2026'] },
];

const DEFAULT_ORG_ROLES = [
  { role: 'Titolare / Responsabile', name: '', phone: '', email: '' },
  { role: 'Venditore / Commerciale', name: '', phone: '', email: '' },
  { role: 'Addetto Scarico / Magazzino', name: '', phone: '', email: '' },
  { role: 'Responsabile Amministrativo (CFO)', name: '', phone: '', email: '' },
];

export default function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company_name: '', phone: '', email: '', client_code: '' });
  const [orgContacts, setOrgContacts] = useState(DEFAULT_ORG_ROLES);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState(false);
  const [supplierLogos, setSupplierLogos] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: pData }, { data: mData }, { data: oData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('measurements').select('*').order('created_at', { ascending: false }),
        supabase.from('sales_objectives').select('*').eq('user_id', user.id),
      ]);
      if (pData) {
        setProfile(pData);
        setForm({ company_name: pData.company_name || '', phone: pData.phone || '', email: pData.email || '', client_code: pData.client_code || '' });
        if (pData.logo_url) setLogoUrl(pData.logo_url);
        if (pData.supplier_logos && typeof pData.supplier_logos === 'object') {
          setSupplierLogos(pData.supplier_logos as Record<string, string>);
        }
      }
      setMeasurements(mData || []);
      setObjectives(oData || []);
      setLoadingData(false);
    };
    fetchData();
  }, [user]);

  const stats = useMemo(() => {
    const total = measurements.length;
    const drafts = measurements.filter(m => m.status === 'bozza').length;
    const sent = measurements.filter(m => m.status === 'ricevuto' || m.status === 'submitted' || m.status === 'in_review').length;
    const quoted = measurements.filter(m => m.status === 'quoted').length;
    const completed = measurements.filter(m => m.status === 'completed' || m.status === 'ordered').length;
    const totalEstimated = measurements.reduce((s, m) => s + (Number((m as any).estimated_price) || 0), 0);
    const totalPaid = measurements.reduce((s, m) => s + (Number((m as any).amount_paid) || 0), 0);
    const disputes = measurements.filter(m => (m as any).has_dispute).length;
    const modifications = measurements.filter(m => (m as any).has_modification).length;
    return { total, drafts, sent, quoted, completed, totalEstimated, totalPaid, remaining: totalEstimated - totalPaid, disputes, modifications };
  }, [measurements]);

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

  const paymentChartData = useMemo(() => [
    { name: 'Pagato', value: stats.totalPaid, color: '#10b981' },
    { name: 'Da pagare', value: Math.max(0, stats.remaining), color: '#ef4444' },
  ].filter(d => d.value > 0), [stats]);

  const productPriceData = useMemo(() => {
    const byType: Record<string, { count: number; total: number }> = {};
    measurements.forEach(m => {
      const label = productLabels[m.product_type] || m.product_type;
      const price = Number((m as any).estimated_price) || 0;
      if (!byType[label]) byType[label] = { count: 0, total: 0 };
      byType[label].count++;
      if (price > 0) byType[label].total += price;
    });
    return Object.entries(byType).map(([name, d]) => ({ name, totale: Math.round(d.total), media: d.count > 0 ? Math.round(d.total / d.count) : 0 }));
  }, [measurements]);

  const supplierStats = useMemo(() => {
    if (!selectedSupplier) return null;
    return {
      total: measurements.length,
      drafts: measurements.filter(m => m.status === 'bozza').length,
      sent: measurements.filter(m => m.status === 'ricevuto' || m.status === 'submitted').length,
      quoted: measurements.filter(m => m.status === 'quoted').length,
      completed: measurements.filter(m => m.status === 'completed' || m.status === 'ordered').length,
    };
  }, [selectedSupplier, measurements]);

  const exportCSV = useCallback(() => {
    const headers = ['Data', 'Prodotto', 'Cliente', 'Indirizzo', 'Stato', 'Prezzo stimato (€)', 'Pagato (€)', 'Residuo (€)', 'Contestazione', 'Modifica'];
    const rows = measurements.map(m => [
      new Date(m.created_at).toLocaleDateString('it-IT'),
      productLabels[m.product_type] || m.product_type,
      m.client_name, m.client_address, m.status,
      Number((m as any).estimated_price) || 0,
      Number((m as any).amount_paid) || 0,
      (Number((m as any).estimated_price) || 0) - (Number((m as any).amount_paid) || 0),
      (m as any).has_dispute ? 'Sì' : 'No',
      (m as any).has_modification ? 'Sì' : 'No',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiche_${form.company_name || 'cliente'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File Excel/CSV scaricato!');
  }, [measurements, form.company_name]);

  const exportPDF = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const fmt = (n: number) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Report Statistiche</title>
      <style>body{font-family:system-ui,sans-serif;padding:40px;color:#1a1a2e}
      h1{color:#1a1a2e;border-bottom:3px solid #f97316;padding-bottom:12px}
      h2{color:#f97316;margin-top:30px}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      th,td{border:1px solid #ddd;padding:10px;text-align:left;font-size:13px}
      th{background:#1a1a2e;color:white}
      tr:nth-child(even){background:#f8f8f8}
      .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:20px 0}
      .stat-box{background:#f8f8fc;border-radius:12px;padding:20px;text-align:center;border:1px solid #e5e7eb}
      .stat-box .value{font-size:28px;font-weight:bold;color:#1a1a2e}
      .stat-box .label{font-size:12px;color:#666;margin-top:4px}
      .footer{margin-top:40px;text-align:center;font-size:11px;color:#999}
      </style></head><body>
      <h1>📊 Report Statistiche — ${form.company_name || 'Cliente'}</h1>
      <p style="color:#666">Generato il ${new Date().toLocaleDateString('it-IT')}</p>
      <div class="summary">
        <div class="stat-box"><div class="value">${stats.total}</div><div class="label">Misurazioni totali</div></div>
        <div class="stat-box"><div class="value">€${fmt(stats.totalEstimated)}</div><div class="label">Totale stimato</div></div>
        <div class="stat-box"><div class="value">€${fmt(stats.totalPaid)}</div><div class="label">Pagato</div></div>
        <div class="stat-box"><div class="value">€${fmt(stats.remaining)}</div><div class="label">Da pagare</div></div>
        <div class="stat-box"><div class="value">${stats.disputes}</div><div class="label">Contestazioni</div></div>
        <div class="stat-box"><div class="value">${stats.modifications}</div><div class="label">Modifiche ordini</div></div>
      </div>
      <h2>Stato misurazioni</h2>
      <div class="summary" style="grid-template-columns:repeat(5,1fr)">
        <div class="stat-box"><div class="value">${stats.drafts}</div><div class="label">Bozze</div></div>
        <div class="stat-box"><div class="value">${stats.sent}</div><div class="label">Inviate</div></div>
        <div class="stat-box"><div class="value">${stats.quoted}</div><div class="label">Preventivate</div></div>
        <div class="stat-box"><div class="value">${stats.completed}</div><div class="label">Completate</div></div>
        <div class="stat-box"><div class="value">${stats.total}</div><div class="label">Totale</div></div>
      </div>
      <h2>Dettaglio misurazioni</h2>
      <table><thead><tr><th>Data</th><th>Prodotto</th><th>Cliente</th><th>Stato</th><th>Prezzo €</th><th>Pagato €</th><th>Residuo €</th></tr></thead><tbody>
      ${measurements.map(m => `<tr>
        <td>${new Date(m.created_at).toLocaleDateString('it-IT')}</td>
        <td>${productLabels[m.product_type] || m.product_type}</td>
        <td>${m.client_name}</td>
        <td>${m.status}</td>
        <td>${fmt(Number((m as any).estimated_price) || 0)}</td>
        <td>${fmt(Number((m as any).amount_paid) || 0)}</td>
        <td>${fmt((Number((m as any).estimated_price) || 0) - (Number((m as any).amount_paid) || 0))}</td>
      </tr>`).join('')}
      </tbody></table>
      <div class="footer">Documento generato automaticamente dal portale misurazioni</div>
      </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }, [measurements, form.company_name, stats]);

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user || !profile) return;
    setUploadingLogo(true);
    try {
      const file = e.target.files[0];
      const path = `company/${user.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      const { error: dbErr } = await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', profile.id);
      if (dbErr) throw dbErr;
      setLogoUrl(publicUrl);
      toast.success('Logo caricato!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSupplierLogoUpload = async (supplierId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user || !profile) return;
    try {
      const file = e.target.files[0];
      const path = `suppliers/${user.id}/${supplierId}_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
      const newLogos = { ...supplierLogos, [supplierId]: publicUrl };
      const { error: dbErr } = await supabase.from('profiles').update({ supplier_logos: newLogos }).eq('id', profile.id);
      if (dbErr) throw dbErr;
      setSupplierLogos(newLogos);
      toast.success('Logo fornitore caricato!');
    } catch (err: any) {
      toast.error(err.message);
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
          <h1 className="text-lg font-bold font-heading text-foreground">Area Personale</h1>
        </div>
      </header>

      <main className="container max-w-6xl py-8">
        <Dialog open={logoPreview} onOpenChange={setLogoPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-heading">Logo aziendale</DialogTitle></DialogHeader>
            {logoUrl && <img src={logoUrl} alt="Logo aziendale" className="w-full rounded-lg" />}
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" /> Profilo</TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Statistiche</TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Fornitori</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Organigramma</TabsTrigger>
          </TabsList>

          {/* TAB: Profile */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-cover border border-border cursor-pointer hover:ring-2 hover:ring-accent transition-all" onClick={() => setLogoPreview(true)} />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <span>Dati Personali</span>
                    <div className="mt-1">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                      <Button variant="ghost" size="sm" asChild className="text-xs h-7" disabled={uploadingLogo}>
                        <label htmlFor="logo-upload" className="cursor-pointer gap-1">
                          <Upload className="h-3 w-3" /> {uploadingLogo ? 'Caricamento...' : 'Carica logo'}
                        </label>
                      </Button>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingData ? (
                  <div className="animate-pulse h-20 bg-muted rounded" />
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Ragione sociale</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Telefono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Codice cliente</Label><Input value={form.client_code} disabled className="bg-muted" /></div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" /> {saving ? 'Salvataggio...' : 'Salva modifiche'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Statistics */}
          <TabsContent value="stats" className="space-y-6">
            {/* Export buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                <Download className="h-4 w-4" /> Scarica Excel/CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
                <FileText className="h-4 w-4" /> Scarica PDF
              </Button>
            </div>

            {/* Measurement counts */}
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

            {/* Charts: Status + Product trend */}
            {measurements.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-heading flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /> Stato misurazioni</CardTitle></CardHeader>
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
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-heading flex items-center gap-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /> Andamento per tipologia</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={monthlyProductData}>
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

            {/* Financial summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading flex items-center gap-2"><Euro className="h-4 w-4 text-accent" /> Situazione finanziaria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
                  {[
                    { label: 'Totale stimato', value: `€${stats.totalEstimated.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, icon: Euro, color: 'text-foreground' },
                    { label: 'Pagato', value: `€${stats.totalPaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, icon: CreditCard, color: 'text-green-600' },
                    { label: 'Da pagare', value: `€${Math.max(0, stats.remaining).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, icon: CreditCard, color: 'text-red-500' },
                    { label: '% saldato', value: stats.totalEstimated > 0 ? `${Math.round((stats.totalPaid / stats.totalEstimated) * 100)}%` : '—', icon: CheckCircle, color: 'text-accent' },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl border border-border p-4 text-center">
                      <item.icon className={`h-5 w-5 mx-auto mb-2 ${item.color}`} />
                      <p className={`text-xl font-bold font-heading ${item.color}`}>{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>
                {paymentChartData.length > 0 && (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={paymentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: €${value.toLocaleString('it-IT')}`}>
                        {paymentChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `€${v.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Price by product type */}
            {productPriceData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2"><BarChart3 className="h-4 w-4 text-accent" /> Spesa per tipologia prodotto</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={productPriceData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => `€${v.toLocaleString('it-IT')}`} />
                      <Legend />
                      <Bar dataKey="totale" name="Totale €" fill="#f97316" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="media" name="Media €" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Disputes & Modifications */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Contestazioni</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.disputes === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nessuna contestazione aperta</p>
                      <p className="text-xs text-muted-foreground mt-1">Ottimo lavoro! Tutti gli ordini procedono senza problemi.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/20 p-4">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                        <div>
                          <p className="text-2xl font-bold text-red-600">{stats.disputes}</p>
                          <p className="text-xs text-muted-foreground">Contestazioni attive</p>
                        </div>
                      </div>
                      {measurements.filter(m => (m as any).has_dispute).map(m => (
                        <div key={m.id} className="rounded-lg border border-red-200 p-3">
                          <p className="text-sm font-medium text-foreground">{m.client_name} — {productLabels[m.product_type] || m.product_type}</p>
                          <p className="text-xs text-muted-foreground mt-1">{(m as any).dispute_notes || 'Dettagli in fase di revisione'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2"><RefreshCw className="h-4 w-4 text-amber-500" /> Modifiche ordini</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.modifications === 0 ? (
                    <div className="text-center py-6">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nessuna modifica richiesta</p>
                      <p className="text-xs text-muted-foreground mt-1">Gli ordini procedono come previsto.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4">
                        <RefreshCw className="h-6 w-6 text-amber-500" />
                        <div>
                          <p className="text-2xl font-bold text-amber-600">{stats.modifications}</p>
                          <p className="text-xs text-muted-foreground">Modifiche richieste</p>
                        </div>
                      </div>
                      {measurements.filter(m => (m as any).has_modification).map(m => (
                        <div key={m.id} className="rounded-lg border border-amber-200 p-3">
                          <p className="text-sm font-medium text-foreground">{m.client_name} — {productLabels[m.product_type] || m.product_type}</p>
                          <p className="text-xs text-muted-foreground mt-1">{(m as any).modification_notes || 'In fase di valutazione'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sales Objectives */}
            {objectives.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2"><Target className="h-4 w-4 text-accent" /> Obiettivi di vendita</CardTitle>
                  <CardDescription>I tuoi obiettivi commerciali e il progresso attuale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {objectives.map((obj: any) => {
                    const periodLabel = obj.period === 'monthly' ? `${String(obj.month).padStart(2, '0')}/${obj.year}` : obj.period === 'quarterly' ? `Q${obj.month ? Math.ceil(obj.month / 3) : '?'}/${obj.year}` : `${obj.year}`;
                    const productLabel = obj.product_type ? (productLabels[obj.product_type] || obj.product_type) : 'Tutti i prodotti';
                    const brandLabel = obj.brand || 'Tutte le marche';

                    // Calculate progress from measurements
                    const relevantMeasurements = measurements.filter(m => {
                      if (!['completed', 'ordered', 'quoted'].includes(m.status)) return false;
                      if (obj.product_type && m.product_type !== obj.product_type) return false;
                      const d = new Date(m.created_at);
                      if (d.getFullYear() !== obj.year) return false;
                      if (obj.period === 'monthly' && obj.month && (d.getMonth() + 1) !== obj.month) return false;
                      if (obj.period === 'quarterly' && obj.month) {
                        const q = Math.ceil((d.getMonth() + 1) / 3);
                        const targetQ = Math.ceil(obj.month / 3);
                        if (q !== targetQ) return false;
                      }
                      return true;
                    });

                    const currentCount = relevantMeasurements.length;
                    const currentAmount = relevantMeasurements.reduce((s: number, m: any) => s + (Number(m.estimated_price) || 0), 0);
                    const countProgress = obj.target_count ? Math.min(100, Math.round((currentCount / obj.target_count) * 100)) : null;
                    const amountProgress = obj.target_amount ? Math.min(100, Math.round((currentAmount / obj.target_amount) * 100)) : null;

                    return (
                      <div key={obj.id} className="rounded-xl border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{productLabel}</p>
                            <p className="text-[10px] text-muted-foreground">{brandLabel} • {periodLabel}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{obj.period === 'monthly' ? 'Mensile' : obj.period === 'quarterly' ? 'Trimestrale' : 'Annuale'}</Badge>
                        </div>
                        {countProgress !== null && (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Quantità</span>
                              <span className="font-medium text-foreground">{currentCount}/{obj.target_count}</span>
                            </div>
                            <Progress value={countProgress} className="h-2" />
                          </div>
                        )}
                        {amountProgress !== null && (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Fatturato</span>
                              <span className="font-medium text-foreground">€{Math.round(currentAmount).toLocaleString('it-IT')} / €{Number(obj.target_amount).toLocaleString('it-IT')}</span>
                            </div>
                            <Progress value={amountProgress} className="h-2" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB: Suppliers */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2"><Building2 className="h-5 w-5 text-accent" /> Aziende di riferimento</CardTitle>
                <CardDescription>Accedi ai dati e ai cataloghi dei nostri fornitori partner</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SUPPLIERS.map(s => (
                    <div key={s.id} onClick={() => setSelectedSupplier(selectedSupplier === s.id ? null : s.id)}
                      className={`rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-card-hover ${selectedSupplier === s.id ? 'border-accent bg-accent/5' : 'border-border'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        {supplierLogos[s.id] ? (
                          <img src={supplierLogos[s.id]} alt={s.name} className="h-10 w-10 rounded-lg object-contain border border-border" />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><Building2 className="h-5 w-5 text-muted-foreground" /></div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.category}</p>
                        </div>
                        <div onClick={e => e.stopPropagation()}>
                          <input type="file" accept="image/*" className="hidden" id={`supplier-logo-${s.id}`}
                            onChange={e => handleSupplierLogoUpload(s.id, e)} />
                          <Button variant="ghost" size="sm" asChild className="text-[10px] h-6 px-2">
                            <label htmlFor={`supplier-logo-${s.id}`} className="cursor-pointer gap-1"><Upload className="h-2.5 w-2.5" /> Logo</label>
                          </Button>
                        </div>
                      </div>
                      {selectedSupplier === s.id && (
                        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                          {supplierStats && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {[
                                { label: 'Bozze', value: supplierStats.drafts },
                                { label: 'Inviate', value: supplierStats.sent },
                                { label: 'Preventivate', value: supplierStats.quoted },
                                { label: 'Completate', value: supplierStats.completed },
                              ].map(st => (
                                <div key={st.label} className="rounded-lg bg-muted p-3 text-center">
                                  <p className="text-lg font-bold font-heading text-foreground">{st.value}</p>
                                  <p className="text-[10px] text-muted-foreground">{st.label}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Cataloghi disponibili</p>
                            <div className="space-y-2">
                              {s.catalogs.map(cat => (
                                <div key={cat} className="flex items-center justify-between rounded-lg border border-border p-3">
                                  <span className="text-sm text-foreground">{cat}</span>
                                  <Badge variant="outline" className="text-[10px]">PDF</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Org chart */}
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2"><Users className="h-5 w-5 text-accent" /> Organigramma aziendale</CardTitle>
                <CardDescription>Ruoli e contatti del tuo team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {orgContacts.map((contact, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-4 space-y-3">
                    <Badge variant="secondary" className="text-xs">{contact.role}</Badge>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nome e Cognome</Label>
                        <Input placeholder="Mario Rossi" value={contact.name}
                          onChange={e => { const c = [...orgContacts]; c[idx] = { ...c[idx], name: e.target.value }; setOrgContacts(c); }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Telefono</Label>
                        <Input placeholder="+39 ..." value={contact.phone}
                          onChange={e => { const c = [...orgContacts]; c[idx] = { ...c[idx], phone: e.target.value }; setOrgContacts(c); }} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                        <Input placeholder="email@azienda.it" value={contact.email}
                          onChange={e => { const c = [...orgContacts]; c[idx] = { ...c[idx], email: e.target.value }; setOrgContacts(c); }} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={() => setOrgContacts(prev => [...prev, { role: 'Altro', name: '', phone: '', email: '' }])}>
                  + Aggiungi ruolo
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
