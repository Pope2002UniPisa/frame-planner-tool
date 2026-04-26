import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
import { ArrowLeft, Save, User, BarChart3, FileText, Edit3, Send, Package, CheckCircle, Building2, Users, Upload, Phone, Mail, BookOpen, Download, AlertTriangle, CreditCard, RefreshCw, Euro, Target, ExternalLink } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { productLabels, WORKFLOW_STEPS, getWorkflowIndex, statusLabels } from '@/lib/constants';

const LINE_COLORS: Record<string, string> = {
  Finestra: '#f97316', 'Porta Finestra': '#3b82f6', Porta: '#a855f7',
  Basculante: '#6366f1', Zanzariera: '#10b981', Persiana: '#f59e0b',
};

const SUPPLIERS = [
  { id: 'ferrerolegno', name: 'FerreroLegno SPA', category: 'Porte in legno e vetro', defaultLogo: '/images/ferrerolegno.png' },
  { id: 'madrugada', name: 'Madrugada Group', category: 'Infissi in PVC', defaultLogo: '/images/madrugada.png' },
  { id: 'nurith', name: 'Nurith SPA', category: 'Infissi, oscuranti e portoncini in PVC', defaultLogo: '/images/finestrenurith.png' },
  { id: 'denardi', name: 'Denardi SRL', category: 'Basculanti in acciaio e legno', defaultLogo: '/images/denardi.png' },
  { id: 'anger', name: 'Anger SRL', category: 'Infissi in legno', defaultLogo: '/images/logo-Anger.png' },
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
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const [profile, setProfile] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company_name: '', phone: '', email: '', client_code: '', full_name: '' });
  const [orgContacts, setOrgContacts] = useState(DEFAULT_ORG_ROLES);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState(false);
  const [supplierLogos, setSupplierLogos] = useState<Record<string, string>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [supplierCatalogs, setSupplierCatalogs] = useState<Record<string, Array<{ id: string; name: string; pdf_url: string | null }>>>({});
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'all' | 'month' | 'year'>('all');
  const [statsYear, setStatsYear] = useState(new Date().getFullYear());
  const [statsMonth, setStatsMonth] = useState(new Date().getMonth() + 1);
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: pData }, { data: mData }, { data: oData }, { data: cData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase
          .from('measurements')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('sales_objectives').select('*').eq('user_id', user.id),
        supabase.from('supplier_catalogs').select('*').order('sort_order', { ascending: true }),
      ]);
      if (pData) {
        setProfile(pData);
        setForm({ company_name: pData.company_name || '', phone: pData.phone || '', email: pData.email || '', client_code: pData.client_code || '', full_name: pData.full_name || '' });
        if (pData.logo_url) setLogoUrl(pData.logo_url);
        if (Array.isArray(pData.org_contacts) && pData.org_contacts.length > 0) {
          setOrgContacts(pData.org_contacts as typeof DEFAULT_ORG_ROLES);
        }
      }
      setMeasurements(mData || []);
      setObjectives(oData || []);
      // Group catalogs by supplier_id
      const grouped: Record<string, Array<{ id: string; name: string; pdf_url: string | null }>> = {};
      (cData || []).forEach((c: any) => {
        if (!grouped[c.supplier_id]) grouped[c.supplier_id] = [];
        grouped[c.supplier_id].push({ id: c.id, name: c.name, pdf_url: c.pdf_url });
      });
      setSupplierCatalogs(grouped);
      setLoadingData(false);
    };
    fetchData();
  }, [user]);

  const filteredMeasurements = useMemo(() => {
    if (statsPeriod === 'all') return measurements;
    return measurements.filter(m => {
      const d = new Date(m.created_at);
      if (statsPeriod === 'year') return d.getFullYear() === statsYear;
      return d.getFullYear() === statsYear && d.getMonth() + 1 === statsMonth;
    });
  }, [measurements, statsPeriod, statsYear, statsMonth]);

  const stats = useMemo(() => {
    const total = filteredMeasurements.length;
    const drafts = filteredMeasurements.filter(m => m.status === 'bozza').length;
    const sent = filteredMeasurements.filter(m => m.status === 'ricevuto' || m.status === 'submitted' || m.status === 'in_review').length;
    const quoted = filteredMeasurements.filter(m => m.status === 'quoted').length;
    const completed = filteredMeasurements.filter(m => m.status === 'completed' || m.status === 'ordered').length;
    const totalEstimated = filteredMeasurements.reduce((s, m) => s + (Number((m as any).estimated_price) || 0), 0);
    const totalPaid = filteredMeasurements.reduce((s, m) => s + (Number((m as any).amount_paid) || 0), 0);
    const disputes = filteredMeasurements.filter(m => (m as any).has_dispute).length;
    const modifications = filteredMeasurements.filter(m => (m as any).has_modification).length;
    return { total, drafts, sent, quoted, completed, totalEstimated, totalPaid, remaining: totalEstimated - totalPaid, disputes, modifications };
  }, [filteredMeasurements]);

  const statusChartData = useMemo(() => [
    { name: 'Bozze', value: stats.drafts, color: '#94a3b8' },
    { name: 'Inviate', value: stats.sent, color: '#3b82f6' },
    { name: 'Preventivate', value: stats.quoted, color: '#f59e0b' },
    { name: 'Completate', value: stats.completed, color: '#10b981' },
  ].filter(d => d.value > 0), [stats]);

  const monthlyProductData = useMemo(() => {
    const days: Record<string, Record<string, number>> = {};
    filteredMeasurements.forEach(m => {
      const d = new Date(m.created_at);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = productLabels[m.product_type] || m.product_type;
      if (!days[key]) days[key] = {};
      days[key][label] = (days[key][label] || 0) + 1;
    });
    const sorted = Object.entries(days).sort(([a], [b]) => {
      const [da, ma] = a.split('/').map(Number);
      const [db, mb] = b.split('/').map(Number);
      return ma !== mb ? ma - mb : da - db;
    });
    return sorted.map(([day, counts]) => ({ month: day, ...counts }));
  }, [filteredMeasurements]);

  const productTypes = useMemo(() => {
    const s = new Set<string>();
    filteredMeasurements.forEach(m => s.add(productLabels[m.product_type] || m.product_type));
    return Array.from(s);
  }, [filteredMeasurements]);

  const paymentChartData = useMemo(() => [
    { name: 'Pagato', value: stats.totalPaid, color: '#10b981' },
    { name: 'Da pagare', value: Math.max(0, stats.remaining), color: '#ef4444' },
  ].filter(d => d.value > 0), [stats]);

  const productPriceData = useMemo(() => {
    const byType: Record<string, { count: number; total: number }> = {};
    filteredMeasurements.forEach(m => {
      const label = productLabels[m.product_type] || m.product_type;
      const price = Number((m as any).estimated_price) || 0;
      if (!byType[label]) byType[label] = { count: 0, total: 0 };
      byType[label].count++;
      if (price > 0) byType[label].total += price;
    });
    return Object.entries(byType).map(([name, d]) => ({ name, totale: Math.round(d.total), media: d.count > 0 ? Math.round(d.total / d.count) : 0 }));
  }, [filteredMeasurements]);

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

  const handleSaveOrg = async () => {
    if (!profile) return;
    setSavingOrg(true);
    try {
      const { error } = await supabase.from('profiles').update({ org_contacts: orgContacts }).eq('id', profile.id);
      if (error) throw error;
      toast.success('Organigramma salvato!');
    } catch (err: any) {
      toast.error(err.message || 'Errore');
    } finally {
      setSavingOrg(false);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById('client-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr_${form.client_code || 'cliente'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = useCallback(() => {
    const headers = ['Data', 'Prodotto', 'Cliente', 'Indirizzo', 'Stato', 'Prezzo stimato (€)', 'Pagato (€)', 'Residuo (€)', 'Contestazione', 'Modifica'];
    const rows = filteredMeasurements.map(m => [
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
  }, [filteredMeasurements, form.company_name]);

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
      ${filteredMeasurements.map(m => `<tr>
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
  }, [filteredMeasurements, form.company_name, stats]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        full_name: form.full_name,
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

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card relative">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <User className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-bold font-heading text-foreground">Area Personale</h1>
          <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
            <span className="text-xl font-mono font-bold text-foreground tabular-nums tracking-widest">{clock}</span>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl py-8">
        <Dialog open={logoPreview} onOpenChange={setLogoPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="font-heading">Logo aziendale</DialogTitle></DialogHeader>
            {logoUrl && <img src={logoUrl} alt="Logo aziendale" className="w-full rounded-lg" />}
          </DialogContent>
        </Dialog>

        <Dialog open={!!pdfViewer} onOpenChange={open => !open && setPdfViewer(null)}>
          <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between pr-12">
              <DialogTitle className="font-heading flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" /> {pdfViewer?.name}
              </DialogTitle>
              {pdfViewer?.url && (
                <a href={pdfViewer.url} download target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Scarica
                  </Button>
                </a>
              )}
            </DialogHeader>
            {pdfViewer?.url && (
              <iframe
                src={pdfViewer.url}
                className="flex-1 w-full rounded-b-lg"
                title={pdfViewer.name}
              />
            )}
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
                  {/* con logoUrl si mostra l'immagine, altrimenti icona grigia */}
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain border border-border cursor-pointer hover:ring-2 hover:ring-accent transition-all" onClick={() => setLogoPreview(true)} />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center">
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
                      <div className="space-y-2"><Label>Nome e cognome operatore</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Es. Mario Rossi" /></div>
                      <div className="space-y-2"><Label>Ragione sociale</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Telefono</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Codice cliente</Label><Input value={form.client_code} disabled className="bg-muted" /></div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" /> {saving ? 'Salvataggio...' : 'Salva modifiche'}
                    </Button>
                    {form.client_code && (
                      <div className="flex items-center gap-6 pt-4 border-t border-border">
                        <div className="flex flex-col items-center gap-2">
                          <QRCodeSVG id="client-qr-code" value={form.client_code} size={96} includeMargin />
                          <p className="text-xs text-muted-foreground font-mono">{form.client_code}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground mb-1">Codice QR cliente</p>
                          <p className="text-xs text-muted-foreground mb-3">Stampalo e consegnalo al tuo rappresentante.</p>
                          <Button variant="outline" size="sm" onClick={downloadQR} className="gap-1.5">
                            <Download className="h-3.5 w-3.5" /> Scarica QR
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Statistics */}
          <TabsContent value="stats" className="space-y-6">
            {/* Filters + Export */}
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'year', 'month'] as const).map(p => (
                  <button key={p} onClick={() => setStatsPeriod(p)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${statsPeriod === p ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-accent/10'}`}>
                    {p === 'all' ? 'Tutto' : p === 'year' ? 'Anno' : 'Mese'}
                  </button>
                ))}
                {statsPeriod !== 'all' && (
                  <select value={statsYear} onChange={e => setStatsYear(Number(e.target.value))}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                )}
                {statsPeriod === 'month' && (
                  <select value={statsMonth} onChange={e => setStatsMonth(Number(e.target.value))}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground">
                    {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'].map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                  <Download className="h-4 w-4" /> Excel/CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
                  <FileText className="h-4 w-4" /> PDF
                </Button>
              </div>
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

            {/* Workflow visivo ordini attivi */}
            {filteredMeasurements.filter(m => m.status !== 'bozza' && m.status !== 'completed').length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading flex items-center gap-2"><Package className="h-4 w-4 text-accent" /> Stato ordini in corso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredMeasurements.filter(m => m.status !== 'bozza' && m.status !== 'completed').slice(0, 5).map(m => {
                    const step = getWorkflowIndex(m.status);
                    return (
                      <div key={m.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-foreground">{productLabels[m.product_type] || m.product_type} — {m.client_name}</p>
                          <Badge variant="outline" className="text-[10px]">{statusLabels[m.status]?.label || m.status}</Badge>
                        </div>
                        <div className="flex items-center gap-0">
                          {WORKFLOW_STEPS.map((s, i) => (
                            <div key={s.key} className="flex items-center flex-1">
                              <div className={`flex flex-col items-center flex-1 ${i <= step ? 'text-accent' : 'text-muted-foreground'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors ${i < step ? 'bg-accent border-accent text-accent-foreground' : i === step ? 'border-accent text-accent bg-accent/10' : 'border-border bg-muted'}`}>
                                  {i < step ? '✓' : i + 1}
                                </div>
                                <span className="text-[9px] mt-0.5 text-center leading-tight hidden sm:block">{s.label}</span>
                              </div>
                              {i < WORKFLOW_STEPS.length - 1 && (
                                <div className={`h-0.5 flex-1 mx-0.5 ${i < step ? 'bg-accent' : 'bg-border'}`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Charts: Status + Product trend */}
            {filteredMeasurements.length > 0 && (
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
                      {filteredMeasurements.filter(m => (m as any).has_dispute).map(m => (
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
                      {filteredMeasurements.filter(m => (m as any).has_modification).map(m => (
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
                      if (m.status === 'bozza') return false;
                      if (obj.product_type && m.product_type !== obj.product_type) return false;
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
                        {/* */}
                        {/* Devo modificare per avere il logo permanente dei fornitori */}
                        {/* */}
                        <img
                          src={supabase.storage.from('logos').getPublicUrl(`suppliers/${s.id}`).data.publicUrl}
                          alt={s.name}
                          className="h-10 w-10 rounded-lg object-contain border border-border"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = s.defaultLogo || '';
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.category}</p>
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
                              {(supplierCatalogs[s.id] || []).length > 0 ? (
                                supplierCatalogs[s.id].map(cat => (
                                  <div key={cat.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                                    <span className="text-sm text-foreground">{cat.name}</span>
                                    {cat.pdf_url ? (
                                      <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
                                        onClick={e => { e.stopPropagation(); setPdfViewer({ url: cat.pdf_url!, name: cat.name }); }}>
                                        <FileText className="h-3 w-3" /> Apri PDF
                                      </Button>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px]">PDF</Badge>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground text-center py-3">Nessun catalogo disponibile</p>
                              )}
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
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setOrgContacts(prev => [...prev, { role: 'Altro', name: '', phone: '', email: '' }])}>
                    + Aggiungi ruolo
                  </Button>
                  <Button onClick={handleSaveOrg} disabled={savingOrg} className="gap-2">
                    <Save className="h-4 w-4" /> {savingOrg ? 'Salvataggio...' : 'Salva organigramma'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
