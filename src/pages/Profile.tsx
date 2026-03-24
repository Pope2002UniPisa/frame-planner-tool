import { useEffect, useState, useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Save, User, BarChart3, FileText, Edit3, Send, Package, CheckCircle, Building2, Users, Upload, Phone, Mail, BookOpen } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

const productLabels: Record<string, string> = {
  finestra: 'Finestra',
  porta_finestra: 'Porta Finestra',
  porta: 'Porta',
  basculante: 'Basculante',
  zanzariera: 'Zanzariera',
  persiana: 'Persiana',
};

const LINE_COLORS: Record<string, string> = {
  Finestra: '#f97316',
  'Porta Finestra': '#3b82f6',
  Porta: '#a855f7',
  Basculante: '#6366f1',
  Zanzariera: '#10b981',
  Persiana: '#f59e0b',
};

// Sample suppliers for now
const SUPPLIERS = [
  { id: 'ferrerolegno', name: 'FerreroLegno SPA', logo: '🏭', category: 'Porte e finestre in legno', catalogs: ['Catalogo Porte 2026', 'Listino Prezzi Q1'] },
  { id: 'aluk', name: 'AluK Group', logo: '🏗️', category: 'Sistemi in alluminio', catalogs: ['Catalogo Alluminio 2026', 'Soluzioni Scorrevoli'] },
  { id: 'finstral', name: 'Finstral SPA', logo: '🪟', category: 'Finestre e porte in PVC', catalogs: ['Catalogo PVC 2026', 'Innovazioni Termiche'] },
  { id: 'somfy', name: 'Somfy Italia', logo: '⚡', category: 'Motorizzazioni e domotica', catalogs: ['Catalogo Motori 2026'] },
];

// Sample org roles
const ORG_ROLES = [
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
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ company_name: '', phone: '', email: '', client_code: '' });
  const [orgContacts, setOrgContacts] = useState(ORG_ROLES);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState(false);
  const [supplierLogos, setSupplierLogos] = useState<Record<string, string>>({});

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

  // Supplier-filtered stats
  const supplierStats = useMemo(() => {
    if (!selectedSupplier) return null;
    // For now, show all measurements - in future filter by supplier field
    return {
      total: measurements.length,
      drafts: measurements.filter(m => m.status === 'bozza').length,
      sent: measurements.filter(m => m.status === 'ricevuto' || m.status === 'submitted').length,
      quoted: measurements.filter(m => m.status === 'quoted').length,
      completed: measurements.filter(m => m.status === 'completed' || m.status === 'ordered').length,
    };
  }, [selectedSupplier, measurements]);

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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setLogoFile(url);
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
                  {logoFile ? (
                    <img src={logoFile} alt="Logo" className="h-12 w-12 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <span>Dati Personali</span>
                    <div className="mt-1">
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
                      <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                        <label htmlFor="logo-upload" className="cursor-pointer gap-1">
                          <Upload className="h-3 w-3" /> Carica logo
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
          </TabsContent>

          {/* TAB: Statistics */}
          <TabsContent value="stats" className="space-y-6">
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
          </TabsContent>

          {/* TAB: Suppliers */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-accent" />
                  Aziende di riferimento
                </CardTitle>
                <CardDescription>Accedi ai dati e ai cataloghi dei nostri fornitori partner</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SUPPLIERS.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedSupplier(selectedSupplier === s.id ? null : s.id)}
                      className={`rounded-xl border-2 p-5 cursor-pointer transition-all hover:shadow-card-hover ${
                        selectedSupplier === s.id ? 'border-accent bg-accent/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{s.logo}</span>
                        <div>
                          <p className="font-semibold text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.category}</p>
                        </div>
                      </div>
                      {selectedSupplier === s.id && (
                        <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                          {/* Stats for this supplier */}
                          {supplierStats && (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <div className="rounded-lg bg-muted p-3 text-center">
                                <p className="text-lg font-bold font-heading text-foreground">{supplierStats.drafts}</p>
                                <p className="text-[10px] text-muted-foreground">Bozze</p>
                              </div>
                              <div className="rounded-lg bg-muted p-3 text-center">
                                <p className="text-lg font-bold font-heading text-foreground">{supplierStats.sent}</p>
                                <p className="text-[10px] text-muted-foreground">Inviate</p>
                              </div>
                              <div className="rounded-lg bg-muted p-3 text-center">
                                <p className="text-lg font-bold font-heading text-foreground">{supplierStats.quoted}</p>
                                <p className="text-[10px] text-muted-foreground">Preventivate</p>
                              </div>
                              <div className="rounded-lg bg-muted p-3 text-center">
                                <p className="text-lg font-bold font-heading text-foreground">{supplierStats.completed}</p>
                                <p className="text-[10px] text-muted-foreground">Completate</p>
                              </div>
                            </div>
                          )}
                          {/* Catalogs */}
                          <div>
                            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5" /> Cataloghi disponibili
                            </p>
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
                <CardTitle className="font-heading flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  Organigramma aziendale
                </CardTitle>
                <CardDescription>Ruoli e contatti del tuo team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {orgContacts.map((contact, idx) => (
                  <div key={idx} className="rounded-xl border border-border p-4 space-y-3">
                    <Badge variant="secondary" className="text-xs">{contact.role}</Badge>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Nome e Cognome</Label>
                        <Input
                          placeholder="Mario Rossi"
                          value={contact.name}
                          onChange={e => {
                            const copy = [...orgContacts];
                            copy[idx] = { ...copy[idx], name: e.target.value };
                            setOrgContacts(copy);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Telefono</Label>
                        <Input
                          placeholder="+39 ..."
                          value={contact.phone}
                          onChange={e => {
                            const copy = [...orgContacts];
                            copy[idx] = { ...copy[idx], phone: e.target.value };
                            setOrgContacts(copy);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                        <Input
                          placeholder="email@azienda.it"
                          value={contact.email}
                          onChange={e => {
                            const copy = [...orgContacts];
                            copy[idx] = { ...copy[idx], email: e.target.value };
                            setOrgContacts(copy);
                          }}
                        />
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
