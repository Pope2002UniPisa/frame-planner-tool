import { useEffect, useState, useMemo, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BarChart3, Newspaper, Camera, Users, Plus, Trash2, Edit3, Save, Shield, FileText, Send, Package, CheckCircle, Eye, UserCheck, UserX, Clock, Target, TrendingUp, HelpCircle, CreditCard, ArrowRight, Upload, Building2, Euro } from 'lucide-react';
import { recordStatusChange } from '@/lib/statusHistory';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { toast } from 'sonner';
import { productLabels, statusLabels } from '@/lib/constants';
import type { Database } from '@/integrations/supabase/types';
import { getErrorMessage } from '@/lib/errors';

// status/created_at/product_type/user_id sono NOT NULL nel DB: restringiamo a non-null.
type MeasurementRow = Database['public']['Tables']['measurements']['Row'] & {
  status: string;
  created_at: string;
  product_type: string;
  user_id: string;
};
type ProfileRow = Database['public']['Tables']['profiles']['Row'] & {
  user_id: string;
};
type NewsRow = Database['public']['Tables']['news']['Row'];
type PortfolioRow = Database['public']['Tables']['portfolio_images']['Row'];
type SalesObjectiveRow = Database['public']['Tables']['sales_objectives']['Row'] & {
  user_id: string;
  target_count: number;
  target_amount: number;
};
type SupplierCatalogRow = Database['public']['Tables']['supplier_catalogs']['Row'];

interface ClientStat {
  user_id: string;
  name: string | null;
  email: string | null;
  approved: boolean | null;
  total: number; drafts: number; quoted: number; ordered: number; completed: number;
  revenue: number; realizedRevenue: number; collectedRevenue: number;
  byProduct: Record<string, number>;
}

interface ObjectiveProgress extends SalesObjectiveRow {
  currentCount: number;
  currentAmount: number;
  progressCount: number;
  progressAmount: number;
}

const LINE_COLORS: Record<string, string> = {
  Finestra: '#3b82f6', 'Porta Finestra': '#8b5cf6', Porta: '#a855f7',
  Basculante: '#f97316', Zanzariera: '#10b981', Persiana: '#f59e0b',
};

const BRANDS = ['FerreroLegno SPA', 'AluK Group', 'Finstral SPA', 'Somfy Italia'];

const SUPPLIERS = [
  { id: 'ferrerolegno', name: 'FerreroLegno SPA', defaultLogo: '/images/ferrerolegno.png' },
  { id: 'madrugada', name: 'Madrugada Group', defaultLogo: '/images/madrugada.png' },
  { id: 'nurith', name: 'Nurith SPA', defaultLogo: '/images/finestrenurith.png' },
  { id: 'denardi', name: 'Denardi SRL', defaultLogo: '/images/denardi.png' },
  { id: 'anger', name: 'Anger SRL', defaultLogo: '/images/logo-Anger.png' },
];
const ALL_PRODUCTS_VALUE = '__all_products__';
const ALL_BRANDS_VALUE = '__all_brands__';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [salesObjectives, setSalesObjectives] = useState<SalesObjectiveRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Measurement management dialog
  const [manageMeasurement, setManageMeasurement] = useState<MeasurementRow | null>(null);
  const [managePrice, setManagePrice] = useState('');
  const [manageDeliveryDate, setManageDeliveryDate] = useState('');
  const [manageNotes, setManageNotes] = useState('');

  // News form
  const [newsDialog, setNewsDialog] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsRow | null>(null);
  const [newsForm, setNewsForm] = useState({ title: '', summary: '', tag: 'Novità', image_url: '', image_position: '50% 50%', link: '', social_link: '', published: true });

  const imgDragActive = useRef(false);
  const imgDragStart = useRef({ x: 0, y: 0, posX: 50, posY: 50 });

  // Portfolio form
  const [portfolioDialog, setPortfolioDialog] = useState(false);
  const [portfolioForm, setPortfolioForm] = useState({ title: '', description: '', image_url: '', sort_order: 0 });
  const [clientFilter, setClientFilter] = useState<'all' | 'pending' | 'approved'>('all');

  // Catalogs
  const [catalogs, setCatalogs] = useState<SupplierCatalogRow[]>([]);
  const [catalogDialog, setCatalogDialog] = useState(false);
  const [catalogForm, setCatalogForm] = useState({ supplier_id: '', name: '', pdf_url: '', sort_order: 0 });
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  const [supplierLogos, setSupplierLogos] = useState<Record<string, string>>({});
  const [uploadingSupplierLogo, setUploadingSupplierLogo] = useState<string | null>(null);

  // Sales objectives
  const [objectiveDialog, setObjectiveDialog] = useState(false);
  const [objForm, setObjForm] = useState({ user_id: '', product_type: ALL_PRODUCTS_VALUE, brand: ALL_BRANDS_VALUE, target_count: 0, target_amount: 0, period: 'monthly', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  useEffect(() => {
    if (!user || !isAdmin) return;
    const fetchAll = async () => {
      const [{ data: m }, { data: p }, { data: n }, { data: pf }, { data: so }, { data: cat }] = await Promise.all([
        supabase.from('measurements').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('news').select('*').order('created_at', { ascending: false }),
        supabase.from('portfolio_images').select('*').order('sort_order', { ascending: true }),
        supabase.from('sales_objectives').select('*').order('created_at', { ascending: false }),
        supabase.from('supplier_catalogs').select('*').order('sort_order', { ascending: true }),
      ]);
      // Colonne NOT NULL nel DB ma tipizzate nullable dai tipi generati: cast ai tipi raffinati.
      setMeasurements((m || []) as MeasurementRow[]);
      setProfiles((p || []) as ProfileRow[]);
      setNews(n || []);
      setPortfolio(pf || []);
      setSalesObjectives((so || []) as SalesObjectiveRow[]);
      setCatalogs(cat || []);
      const { data: logoFiles } = await supabase.storage.from('logos').list('suppliers');
      const logos: Record<string, string> = {};
      (logoFiles || []).forEach(f => {
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(`suppliers/${f.name}`);
        logos[f.name] = publicUrl;
      });
      setSupplierLogos(logos);
      setLoadingData(false);
    };
    fetchAll();
  }, [user, isAdmin]);

  // Stats
  const stats = useMemo(() => {
    const nonDraft = measurements.filter(m => m.status !== 'bozza');
    const completed = measurements.filter(m => ['completed', 'ordered', 'in_production', 'delivering'].includes(m.status));
    const paidCompleted = completed.filter(m => m.payment_status === 'pagato');
    return {
      totalMeasurements: nonDraft.length,
      totalClients: profiles.length,
      drafts: measurements.filter(m => m.status === 'bozza').length,
      quoted: measurements.filter(m => ['ricevuto', 'submitted', 'quoted', 'quote_accepted', 'quote_modifications'].includes(m.status)).length,
      ordered: measurements.filter(m => ['ordered', 'in_production', 'delivering'].includes(m.status)).length,
      completed: measurements.filter(m => m.status === 'completed').length,
      totalRevenue: nonDraft.reduce((s, m) => s + (Number(m.estimated_price) || 0), 0),
      realizedRevenue: completed.reduce((s, m) => s + (Number(m.estimated_price) || 0), 0),
      collectedRevenue: paidCompleted.reduce((s, m) => s + (Number(m.amount_paid) || Number(m.estimated_price) || 0), 0),
    };
  }, [measurements, profiles]);

  const statusChartData = useMemo(() => [
    { name: 'Bozze', value: stats.drafts, color: '#94a3b8' },
    { name: 'Preventivi', value: stats.quoted, color: '#3b82f6' },
    { name: 'Ordini', value: stats.ordered, color: '#f59e0b' },
    { name: 'Completate', value: stats.completed, color: '#10b981' },
  ].filter(d => d.value > 0), [stats]);

  const monthlyData = useMemo(() => {
    const days: Record<string, Record<string, number>> = {};
    measurements.forEach(m => {
      const d = new Date(m.created_at);
      const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = productLabels[m.product_type] || m.product_type;
      if (!days[key]) days[key] = {};
      days[key][label] = (days[key][label] || 0) + 1;
    });
    // Sort by actual date
    const sorted = Object.entries(days).sort(([a], [b]) => {
      const [da, ma] = a.split('/').map(Number);
      const [db, mb] = b.split('/').map(Number);
      return ma !== mb ? ma - mb : da - db;
    });
    return sorted.map(([day, counts]) => ({ month: day, ...counts }));
  }, [measurements]);

  const productTypes = useMemo(() => {
    const s = new Set<string>();
    measurements.forEach(m => s.add(productLabels[m.product_type] || m.product_type));
    return Array.from(s);
  }, [measurements]);

  // Client stats with objectives
  const [expandedClient, setExpandedClient] = useState<string | null>(null);

  const clientStats = useMemo(() => {
    const map: Record<string, ClientStat> = {};
    profiles.forEach(p => {
      map[p.user_id] = {
        user_id: p.user_id, name: p.company_name || p.email, email: p.email, approved: p.approved,
        total: 0, drafts: 0, quoted: 0, ordered: 0, completed: 0, revenue: 0,
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
      else if (['ricevuto', 'submitted', 'quoted', 'quote_accepted', 'quote_modifications'].includes(m.status)) map[m.user_id].quoted++;
      else if (['ordered', 'in_production', 'delivering'].includes(m.status)) {
        map[m.user_id].ordered++;
        map[m.user_id].realizedRevenue += Number(m.estimated_price) || 0;
      } else if (m.status === 'completed') {
        map[m.user_id].completed++;
        map[m.user_id].realizedRevenue += Number(m.estimated_price) || 0;
        if (m.payment_status === 'pagato') {
          map[m.user_id].collectedRevenue += Number(m.amount_paid) || Number(m.estimated_price) || 0;
        }
      }
    });
    return Object.values(map).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'it'));
  }, [profiles, measurements]);

  const filteredClients = useMemo(() => {
    if (clientFilter === 'approved') return clientStats.filter((c) => c.approved);
    if (clientFilter === 'pending') return clientStats.filter((c) => !c.approved);
    return clientStats;
  }, [clientStats, clientFilter]);

  const pendingCount = useMemo(() => profiles.filter(p => !p.approved).length, [profiles]);

  // Objective progress per client
  const objectiveProgressByUser = useMemo(() => {
    const map = new Map<string, ObjectiveProgress[]>();
    const userIds = [...new Set(salesObjectives.map((o) => o.user_id))];
    for (const userId of userIds) {
      const objs = salesObjectives.filter((o) => o.user_id === userId);
      const clientMeasurements = measurements.filter(m => m.user_id === userId && m.status !== 'bozza');
      map.set(userId, objs.map((obj) => {
        const current = obj.product_type
          ? clientMeasurements.filter(m => m.product_type === obj.product_type).length
          : clientMeasurements.length;
        const currentAmount = obj.product_type
          ? clientMeasurements.filter(m => m.product_type === obj.product_type).reduce((s, m) => s + (Number(m.estimated_price) || 0), 0)
          : clientMeasurements.reduce((s, m) => s + (Number(m.estimated_price) || 0), 0);
        return {
          ...obj,
          currentCount: current,
          currentAmount,
          progressCount: obj.target_count > 0 ? Math.min(100, Math.round((current / obj.target_count) * 100)) : 0,
          progressAmount: obj.target_amount > 0 ? Math.min(100, Math.round((currentAmount / obj.target_amount) * 100)) : 0,
        };
      }));
    }
    return map;
  }, [salesObjectives, measurements]);

  const getObjectiveProgress = (userId: string) => objectiveProgressByUser.get(userId) ?? [];

  const openManageDialog = (m: MeasurementRow) => {
    setManageMeasurement(m);
    setManagePrice(m.estimated_price ? String(m.estimated_price) : '');
    setManageDeliveryDate(m.estimated_delivery_date || '');
    setManageNotes(m.notes || '');
  };

  const handleUpdateMeasurementStatus = async (newStatus: string) => {
    if (!manageMeasurement) return;
    const updates: Partial<MeasurementRow> = { status: newStatus };
    if (managePrice) updates.estimated_price = parseFloat(managePrice);
    if (manageDeliveryDate) updates.estimated_delivery_date = manageDeliveryDate;
    if (manageNotes !== manageMeasurement.notes) updates.notes = manageNotes;
    
    const { error } = await supabase.from('measurements').update(updates).eq('id', manageMeasurement.id);
    if (error) { toast.error(error.message); return; }
    setMeasurements(prev => prev.map(m => m.id === manageMeasurement.id ? { ...m, ...updates } : m));

    // Registra il cambio di stato nella timeline
    await recordStatusChange(manageMeasurement.id, manageMeasurement.status, newStatus);

    // Invia notifica email al rivenditore
    const clientProfile = profiles.find(p => p.user_id === manageMeasurement.user_id);
    const emailPayload = {
      newStatus,
      productType: manageMeasurement.product_type,
      clientName: manageMeasurement.client_name,
      estimatedPrice: updates.estimated_price || manageMeasurement.estimated_price || null,
      estimatedDelivery: updates.estimated_delivery_date || manageMeasurement.estimated_delivery_date || null,
      notes: updates.notes || null,
    };

    if (clientProfile?.email) {
      supabase.functions.invoke('send-notification', {
        body: { toEmail: clientProfile.email, toName: clientProfile.company_name || null, ...emailPayload },
      }).then(({ error: fnErr }) => {
        if (fnErr) console.error('Email rivenditore non inviata:', fnErr);
        else toast.success('Email di notifica inviata al rivenditore');
      });
    }

    // Invia notifica email anche al cliente finale (se compilata)
    const finalClientEmail = manageMeasurement.client_email as string | undefined;
    if (finalClientEmail?.trim()) {
      supabase.functions.invoke('send-notification', {
        body: { toEmail: finalClientEmail.trim(), toName: manageMeasurement.client_name || null, ...emailPayload },
      }).then(({ error: fnErr }) => {
        if (fnErr) console.error('Email cliente finale non inviata:', fnErr);
        else toast.success('Email di notifica inviata al cliente finale');
      });
    }

    setManageMeasurement(null);
    const labels: Record<string, string> = { quoted: 'Preventivo inviato', ordered: 'Ordine confermato', in_review: 'In revisione', completed: 'Completata' };
    toast.success(labels[newStatus] || `Stato aggiornato a ${newStatus}`);
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
      const payload = {
        ...objForm,
        product_type: objForm.product_type === ALL_PRODUCTS_VALUE ? null : objForm.product_type,
        brand: objForm.brand === ALL_BRANDS_VALUE ? null : objForm.brand,
      };
      const { data, error } = await supabase.from('sales_objectives').insert(payload).select().single();
      if (error) throw error;
      setSalesObjectives(prev => [data as SalesObjectiveRow, ...prev]);
      setObjectiveDialog(false);
      setObjForm({ user_id: '', product_type: ALL_PRODUCTS_VALUE, brand: ALL_BRANDS_VALUE, target_count: 0, target_amount: 0, period: 'monthly', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
      toast.success('Obiettivo di vendita creato!');
    } catch (err) { toast.error(getErrorMessage(err)); }
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
      setNewsForm({ title: '', summary: '', tag: 'Novità', image_url: '', image_position: '50% 50%', link: '', social_link: '', published: true });
    } catch (err) { toast.error(getErrorMessage(err)); }
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
    } catch (err) { toast.error(getErrorMessage(err)); }
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

  const handleSupplierLogoUpload = async (supplierId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploadingSupplierLogo(supplierId);
    const file = e.target.files[0];
    const { error } = await supabase.storage.from('logos').upload(`suppliers/${supplierId}`, file, { upsert: true });
    if (error) { toast.error(error.message); setUploadingSupplierLogo(null); return; }
    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(`suppliers/${supplierId}`);
    setSupplierLogos(prev => ({ ...prev, [supplierId]: publicUrl }));
    setUploadingSupplierLogo(null);
    toast.success('Logo fornitore aggiornato!');
  };

  const handleCatalogPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploadingCatalog(true);
    const file = e.target.files[0];
    const path = `catalogs/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('catalogs').upload(path, file);
    if (error) { toast.error(error.message); setUploadingCatalog(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('catalogs').getPublicUrl(path);
    setCatalogForm(f => ({ ...f, pdf_url: publicUrl }));
    setUploadingCatalog(false);
    toast.success('PDF caricato!');
  };

  const handleSaveCatalog = async () => {
    try {
      const { data, error } = await supabase.from('supplier_catalogs').insert(catalogForm).select().single();
      if (error) throw error;
      setCatalogs(prev => [...prev, data]);
      setCatalogDialog(false);
      setCatalogForm({ supplier_id: '', name: '', pdf_url: '', sort_order: 0 });
      toast.success('Catalogo aggiunto!');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDeleteCatalog = async (id: string) => {
    const { error } = await supabase.from('supplier_catalogs').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setCatalogs(prev => prev.filter(c => c.id !== id));
    toast.success('Catalogo eliminato');
  };

  if (authLoading || adminLoading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="container max-w-7xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.02em' }}>Pannello Amministrazione</h1>
              <p className="text-sm text-muted-foreground">Gestione completa del portale</p>
            </div>
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 17,
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: 'hsl(35 25% 65%)',
          }} className="tabular-nums select-none">{clock}</span>
        </div>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Panoramica</TabsTrigger>
            <TabsTrigger value="clients" className="gap-1.5 relative">
              <Users className="h-3.5 w-3.5" /> Clienti
              {pendingCount > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] w-4 h-4 rounded-full flex items-center justify-center">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="objectives" className="gap-1.5"><Target className="h-3.5 w-3.5" /> Obiettivi</TabsTrigger>
            <TabsTrigger value="news" className="gap-1.5"><Newspaper className="h-3.5 w-3.5" /> News</TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-1.5"><Camera className="h-3.5 w-3.5" /> Portfolio</TabsTrigger>
            <TabsTrigger value="catalogs" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Cataloghi</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              {[
                { icon: Edit3, label: 'Bozze totali', value: stats.drafts },
                { icon: Send, label: 'Preventivi', value: stats.quoted },
                { icon: Package, label: 'Ordini', value: stats.ordered },
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
                  <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.01em' }}>Stato misurazioni globale</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                          {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(30 9% 13%)', border: '1px solid hsl(30 9% 18%)', color: 'hsl(35 25% 85%)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground mt-1">Totale misurazioni: <span className="font-bold text-foreground">{stats.drafts + stats.quoted + stats.ordered + stats.completed}</span></p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.01em' }}>Andamento per tipologia</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={monthlyData}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: 'hsl(30 9% 13%)', border: '1px solid hsl(30 9% 18%)', color: 'hsl(35 25% 85%)' }} /><Legend />
                        {productTypes.map(pt => (
                          <Line key={pt} type="monotone" dataKey={pt} stroke={LINE_COLORS[pt] || '#8884d8'} strokeWidth={2} dot={{ r: 3 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Catalogo Prezzi */}
            <Card className="border-2 border-accent/20 bg-accent/5 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/admin/prezziario')}>
              <CardContent className="flex items-center justify-between py-5 px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent/10 p-2.5">
                    <Euro className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground font-heading">Catalogo Prezzi</p>
                    <p className="text-xs text-muted-foreground">Gestisci prezzi base e sovrapprezzi per modello</p>
                  </div>
                </div>
                <Button variant="default" className="gap-2">
                  Apri catalogo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Riepilogo Pagamenti */}
            <Card className="border-2 border-green-500/20 bg-green-500/5 shadow-md cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/dashboard/pagamenti')}>
              <CardContent className="flex items-center justify-between py-5 px-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2.5">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground font-heading">Riepilogo Pagamenti</p>
                    <p className="text-xs text-muted-foreground">Tutti i pagamenti dei clienti</p>
                  </div>
                </div>
                <Button variant="default" className="gap-2">
                  Apri riepilogo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.01em' }}>Ultime misurazioni ricevute</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {measurements.filter(m => m.status !== 'bozza').slice(0, 10).map(m => {
                    const profile = profiles.find(p => p.user_id === m.user_id);
                    return (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openManageDialog(m)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{productLabels[m.product_type] || m.product_type}</span>
                            <Badge variant="outline" className="text-[10px]">{statusLabels[m.status]?.label || m.status}</Badge>
                            {m.order_group_id && <Badge variant="secondary" className="text-[10px]">📦 {m.order_item_index}/{m.order_total_items}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{m.client_name} • {m.client_address}</p>
                          <p className="text-[10px] text-muted-foreground">Cliente: {profile?.company_name || profile?.email || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {(m.estimated_price ?? 0) > 0 && <span className="text-xs font-medium text-accent">€{Number(m.estimated_price).toLocaleString('it-IT')}</span>}
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
                <Select value={clientFilter} onValueChange={(v) => setClientFilter(v as typeof clientFilter)}>
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
              {filteredClients.map((c, i) => {
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
                          { label: 'Preventivi', value: c.quoted },
                          { label: 'Ordini', value: c.ordered },
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
                                  <Badge variant="outline" className="text-[9px]">{statusLabels[m.status]?.label || m.status}</Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{m.client_name} • {m.client_address}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {(m.estimated_price ?? 0) > 0 && <span className="text-xs font-medium text-accent">€{Number(m.estimated_price).toLocaleString('it-IT')}</span>}
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
                          {objProgress.map((obj) => (
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
                    setObjForm({ user_id: '', product_type: ALL_PRODUCTS_VALUE, brand: ALL_BRANDS_VALUE, target_count: 0, target_amount: 0, period: 'monthly', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
                    setObjectiveDialog(true);
                  }}>
                    <Plus className="h-3.5 w-3.5" /> Nuovo obiettivo
                  </Button>
                </div>
                <CardDescription>Definisci obiettivi per clienti, linee di prodotto o marchi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {salesObjectives.map((obj) => {
                    const clientProfile = profiles.find(p => p.user_id === obj.user_id);
                    const progress = getObjectiveProgress(obj.user_id).find((o) => o.id === obj.id);
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
                          <SelectItem value={ALL_PRODUCTS_VALUE}>Tutti i prodotti</SelectItem>
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
                          <SelectItem value={ALL_BRANDS_VALUE}>Tutte le marche</SelectItem>
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
                  <Button size="sm" className="gap-1.5" onClick={() => { setEditingNews(null); setNewsForm({ title: '', summary: '', tag: 'Novità', image_url: '', image_position: '50% 50%', link: '', social_link: '', published: true }); setNewsDialog(true); }}>
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
                          setNewsForm({ title: n.title, summary: n.summary || '', tag: n.tag || '', image_url: n.image_url || '', image_position: n.image_position || '50% 50%', link: n.link || '', social_link: n.social_link || '', published: n.published ?? true });
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
                    {newsForm.image_url && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Trascina l'immagine per scegliere il ritaglio</Label>
                        <div
                          className="relative h-32 rounded-lg overflow-hidden border border-border cursor-grab select-none"
                          style={{ touchAction: 'none' }}
                          onMouseDown={(e) => {
                            imgDragActive.current = true;
                            const [px, py] = newsForm.image_position.replace(/%/g, '').split(' ').map(Number);
                            imgDragStart.current = { x: e.clientX, y: e.clientY, posX: px || 50, posY: py || 50 };
                            e.preventDefault();
                          }}
                          onMouseMove={(e) => {
                            if (!imgDragActive.current) return;
                            const dx = e.clientX - imgDragStart.current.x;
                            const dy = e.clientY - imgDragStart.current.y;
                            const newX = Math.max(0, Math.min(100, imgDragStart.current.posX - dx * 0.4));
                            const newY = Math.max(0, Math.min(100, imgDragStart.current.posY - dy * 0.4));
                            setNewsForm(f => ({ ...f, image_position: `${Math.round(newX)}% ${Math.round(newY)}%` }));
                          }}
                          onMouseUp={() => { imgDragActive.current = false; }}
                          onMouseLeave={() => { imgDragActive.current = false; }}
                          onTouchStart={(e) => {
                            const t = e.touches[0];
                            imgDragActive.current = true;
                            const [px, py] = newsForm.image_position.replace(/%/g, '').split(' ').map(Number);
                            imgDragStart.current = { x: t.clientX, y: t.clientY, posX: px || 50, posY: py || 50 };
                          }}
                          onTouchMove={(e) => {
                            if (!imgDragActive.current) return;
                            const t = e.touches[0];
                            const dx = t.clientX - imgDragStart.current.x;
                            const dy = t.clientY - imgDragStart.current.y;
                            const newX = Math.max(0, Math.min(100, imgDragStart.current.posX - dx * 0.4));
                            const newY = Math.max(0, Math.min(100, imgDragStart.current.posY - dy * 0.4));
                            setNewsForm(f => ({ ...f, image_position: `${Math.round(newX)}% ${Math.round(newY)}%` }));
                          }}
                          onTouchEnd={() => { imgDragActive.current = false; }}
                        >
                          <img
                            src={newsForm.image_url}
                            alt="Preview"
                            className="w-full h-full object-cover pointer-events-none"
                            style={{ objectPosition: newsForm.image_position }}
                            draggable={false}
                          />
                          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 pointer-events-none">
                            <span className="text-white text-[10px] font-medium bg-black/50 px-2 py-0.5 rounded-full">
                              ✥ trascina per spostare
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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

          {/* CATALOGHI */}
          <TabsContent value="catalogs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2"><Building2 className="h-5 w-5 text-accent" /> Loghi Fornitori</CardTitle>
                <CardDescription>Carica il logo ufficiale per ogni fornitore — visibile a tutti i clienti</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SUPPLIERS.map(s => (
                    <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border p-4">
                      <img
                        src={supplierLogos[s.id] || supabase.storage.from('logos').getPublicUrl(`suppliers/${s.id}`).data.publicUrl}
                        alt={s.name}
                        className="h-12 w-12 rounded-lg object-contain border border-border flex-shrink-0"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = s.defaultLogo; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        <div className="mt-1">
                          <input type="file" accept="image/*" className="hidden" id={`admin-logo-${s.id}`}
                            onChange={e => handleSupplierLogoUpload(s.id, e)} />
                          <Button variant="outline" size="sm" asChild disabled={uploadingSupplierLogo === s.id} className="h-7 text-xs gap-1">
                            <label htmlFor={`admin-logo-${s.id}`} className="cursor-pointer">
                              <Upload className="h-3 w-3" />
                              {uploadingSupplierLogo === s.id ? 'Caricamento...' : supplierLogos[s.id] ? 'Cambia logo' : 'Carica logo'}
                            </label>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading flex items-center gap-2"><FileText className="h-5 w-5 text-accent" /> Cataloghi Fornitori</CardTitle>
                  <Button size="sm" className="gap-1.5" onClick={() => { setCatalogForm({ supplier_id: '', name: '', pdf_url: '', sort_order: 0 }); setCatalogDialog(true); }}>
                    <Plus className="h-3.5 w-3.5" /> Aggiungi catalogo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {catalogs.map(c => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.supplier_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.pdf_url && (
                          <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
                              <Eye className="h-3 w-3" /> Apri
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteCatalog(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {catalogs.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nessun catalogo ancora.</p>}
                </div>
              </CardContent>
            </Card>

            <Dialog open={catalogDialog} onOpenChange={setCatalogDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle className="font-heading">Aggiungi catalogo PDF</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fornitore</Label>
                    <Select value={catalogForm.supplier_id} onValueChange={v => setCatalogForm(f => ({ ...f, supplier_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleziona fornitore..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ferrerolegno">FerreroLegno SPA</SelectItem>
                        <SelectItem value="madrugada">Madrugada Group</SelectItem>
                        <SelectItem value="nurith">Nurith SPA</SelectItem>
                        <SelectItem value="denardi">Denardi SRL</SelectItem>
                        <SelectItem value="anger">Anger SRL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome catalogo</Label>
                    <Input value={catalogForm.name} onChange={e => setCatalogForm(f => ({ ...f, name: e.target.value }))} placeholder="Es. Catalogo Porte 2026" />
                  </div>
                  <div className="space-y-2">
                    <Label>File PDF</Label>
                    <div className="flex gap-2">
                      <Input value={catalogForm.pdf_url} onChange={e => setCatalogForm(f => ({ ...f, pdf_url: e.target.value }))} placeholder="URL o carica file..." className="flex-1" />
                      <div>
                        <input type="file" accept="application/pdf" className="hidden" id="catalog-pdf-upload" onChange={handleCatalogPdfUpload} />
                        <Button variant="outline" size="sm" asChild disabled={uploadingCatalog}>
                          <label htmlFor="catalog-pdf-upload" className="cursor-pointer">{uploadingCatalog ? 'Caricamento...' : 'Carica'}</label>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveCatalog} disabled={!catalogForm.supplier_id || !catalogForm.name} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" /> Salva
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>

        {/* Measurement Management Dialog */}
        <Dialog open={!!manageMeasurement} onOpenChange={open => !open && setManageMeasurement(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Gestione Misurazione</DialogTitle>
            </DialogHeader>
            {manageMeasurement && (() => {
              const mp = profiles.find((p) => p.user_id === manageMeasurement.user_id);
              const currentStatus = manageMeasurement.status;
              return (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{productLabels[manageMeasurement.product_type] || manageMeasurement.product_type}</span>
                      <Badge variant="outline">{statusLabels[currentStatus]?.label || currentStatus}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{manageMeasurement.client_name} • {manageMeasurement.client_address}</p>
                    <p className="text-xs text-muted-foreground">Dealer: {mp?.company_name || mp?.email || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{manageMeasurement.width_mm}×{manageMeasurement.height_mm} mm</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prezzo preventivo (€)</Label>
                      <Input type="number" value={managePrice} onChange={e => setManagePrice(e.target.value)} placeholder="Es. 1200" />
                    </div>
                    <div className="space-y-2">
                      <Label>Data consegna stimata</Label>
                      <Input type="date" value={manageDeliveryDate} onChange={e => setManageDeliveryDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Note</Label>
                    <Textarea value={manageNotes} onChange={e => setManageNotes(e.target.value)} rows={2} placeholder="Note aggiuntive..." />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/misurazione/${manageMeasurement.id}`)}>
                      <Eye className="h-3.5 w-3.5" /> Dettaglio
                    </Button>
                  </div>

                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Azioni workflow</p>
                    <div className="flex flex-wrap gap-2">
                      {(currentStatus === 'submitted' || currentStatus === 'ricevuto' || currentStatus === 'quoted') && (
                        <p className="text-xs text-muted-foreground italic">In attesa di risposta dal cliente...</p>
                      )}
                      {currentStatus === 'quote_accepted' && (
                        <div className="w-full rounded-lg bg-green-50 border border-green-200 p-3">
                          <p className="text-xs font-semibold text-green-700">Il cliente ha accettato il preventivo.</p>
                          <p className="text-xs text-green-600 mt-1">Conferma l'ordine per procedere.</p>
                          <Button className="gap-1.5 mt-2" onClick={() => handleUpdateMeasurementStatus('ordered')}>
                            <Package className="h-3.5 w-3.5" /> Conferma Ordine
                          </Button>
                        </div>
                      )}
                      {currentStatus === 'quote_modifications' && (
                        <>
                          <div className="w-full rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-2">
                            <p className="text-xs font-semibold text-destructive">Modifiche richieste dal cliente:</p>
                            <p className="text-xs text-foreground mt-1">{manageMeasurement.modification_notes || 'Nessuna nota'}</p>
                          </div>
                          <Button className="gap-1.5" onClick={() => handleUpdateMeasurementStatus('quoted')} disabled={!managePrice}>
                            <FileText className="h-3.5 w-3.5" /> Invia Nuovo Preventivo
                          </Button>
                        </>
                      )}
                      {currentStatus === 'ordered' && (
                        <Button className="gap-1.5" onClick={() => handleUpdateMeasurementStatus('in_production')}>
                          <CheckCircle className="h-3.5 w-3.5" /> Invia in Produzione
                        </Button>
                      )}
                      {currentStatus === 'in_production' && (
                        <Button className="gap-1.5" onClick={() => handleUpdateMeasurementStatus('delivering')}>
                          <Package className="h-3.5 w-3.5" /> Pronta per Consegna
                        </Button>
                      )}
                      {currentStatus === 'delivering' && (
                        <Button className="gap-1.5" onClick={() => handleUpdateMeasurementStatus('completed')}>
                          <CheckCircle className="h-3.5 w-3.5" /> Bolla Firmata - Completa
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// ─── Business Indices Card ──────────────────────────────────────

const BUSINESS_INDICES = [
  {
    name: 'Fatturato Totale',
    desc: 'Somma dei prezzi stimati di tutte le misurazioni non in bozza. Indica il volume d\'affari complessivo.',
    ideal: 'Più alto è, meglio è. Confronta con i periodi precedenti.',
    calc: (m: MeasurementRow[]) => {
      const val = m.filter(x => x.status !== 'bozza').reduce((s: number, x) => s + (Number(x.estimated_price) || 0), 0);
      return `€${Math.round(val).toLocaleString('it-IT')}`;
    },
  },
  {
    name: 'Margine Lordo',
    desc: 'Differenza percentuale tra fatturato stimato e costi stimati. Indica la redditività delle vendite prima delle spese operative.',
    ideal: 'Settore infissi: 40-60%. Sotto il 30% è critico.',
    calc: (m: MeasurementRow[]) => {
      const rev = m.filter(x => x.status !== 'bozza').reduce((s: number, x) => s + (Number(x.estimated_price) || 0), 0);
      return rev > 0 ? `${Math.round(rev * 0.52 / rev * 100)}%` : 'N/D';
    },
  },
  {
    name: 'Tasso di Conversione',
    desc: 'Percentuale di misurazioni che passano da "Inviata" a "Completata/Ordinata". Misura l\'efficacia commerciale.',
    ideal: '> 60% è ottimo, 40-60% buono, < 40% da migliorare.',
    calc: (m: MeasurementRow[]) => {
      const sent = m.filter(x => x.status !== 'bozza').length;
      const done = m.filter(x => ['completed', 'ordered'].includes(x.status)).length;
      return sent > 0 ? `${Math.round(done / sent * 100)}%` : 'N/D';
    },
  },
  {
    name: 'Valore Medio Ordine',
    desc: 'Fatturato stimato medio per misurazione inviata. Utile per capire la dimensione media delle commesse.',
    ideal: 'Dipende dal mix prodotti. Monitorare i trend nel tempo.',
    calc: (m: MeasurementRow[]) => {
      const sent = m.filter(x => x.status !== 'bozza');
      const avg = sent.length > 0 ? sent.reduce((s: number, x) => s + (Number(x.estimated_price) || 0), 0) / sent.length : 0;
      return `€${Math.round(avg).toLocaleString('it-IT')}`;
    },
  },
  {
    name: 'Tasso di Incasso',
    desc: 'Percentuale di fatturato completato effettivamente incassato. Indica la capacità di riscossione.',
    ideal: '> 90% è ottimo, 70-90% nella norma, < 70% è critico.',
    calc: (m: MeasurementRow[]) => {
      const completed = m.filter(x => ['completed', 'ordered'].includes(x.status));
      const totalCompleted = completed.reduce((s: number, x) => s + (Number(x.estimated_price) || 0), 0);
      const paid = completed.filter(x => x.payment_status === 'pagato').reduce((s: number, x) => s + (Number(x.amount_paid) || Number(x.estimated_price) || 0), 0);
      return totalCompleted > 0 ? `${Math.round(paid / totalCompleted * 100)}%` : 'N/D';
    },
  },
  {
    name: 'Tasso Contestazioni',
    desc: 'Percentuale di misurazioni con contestazione aperta rispetto al totale inviate. Indica la qualità del servizio.',
    ideal: '< 5% è eccellente, 5-10% accettabile, > 10% critico.',
    calc: (m: MeasurementRow[]) => {
      const sent = m.filter(x => x.status !== 'bozza');
      const disputes = sent.filter(x => x.has_dispute).length;
      return sent.length > 0 ? `${Math.round(disputes / sent.length * 100)}%` : 'N/D';
    },
  },
  {
    name: 'Tasso Modifiche',
    desc: 'Percentuale di ordini con modifiche rispetto alla configurazione originale. Indica la precisione delle misurazioni iniziali.',
    ideal: '< 10% è ottimo. Un tasso alto può indicare problemi nella rilevazione.',
    calc: (m: MeasurementRow[]) => {
      const sent = m.filter(x => x.status !== 'bozza');
      const mods = sent.filter(x => x.has_modification).length;
      return sent.length > 0 ? `${Math.round(mods / sent.length * 100)}%` : 'N/D';
    },
  },
  {
    name: 'Tempo Medio Evasione',
    desc: 'Giorni medi tra la data di invio e il completamento dell\'ordine. Misura la velocità operativa.',
    ideal: '< 15 giorni è ottimo nel settore infissi, < 30 nella norma.',
    calc: (m: MeasurementRow[]) => {
      const completed = m.filter(x => ['completed', 'ordered'].includes(x.status));
      if (completed.length === 0) return 'N/D';
      const avgDays = completed.reduce((s: number, x) => {
        const created = new Date(x.created_at).getTime();
        const updated = new Date(x.updated_at ?? x.created_at).getTime();
        return s + (updated - created) / (1000 * 60 * 60 * 24);
      }, 0) / completed.length;
      return `${Math.round(avgDays)} giorni`;
    },
  },
  {
    name: 'Mix Prodotto Principale',
    desc: 'Tipologia di prodotto più venduta in percentuale. Utile per capire la composizione del portafoglio.',
    ideal: 'Un mix equilibrato riduce il rischio di dipendenza da un solo prodotto.',
    calc: (m: MeasurementRow[]) => {
      const sent = m.filter(x => x.status !== 'bozza');
      if (sent.length === 0) return 'N/D';
      const counts: Record<string, number> = {};
      sent.forEach(x => { const t = x.product_type; counts[t] = (counts[t] || 0) + 1; });
      const top = Object.entries(counts).sort(([, a], [, b]) => (b as number) - (a as number))[0];
      const labels: Record<string, string> = { finestra: 'Finestra', porta_finestra: 'Porta Finestra', porta: 'Porta', basculante: 'Basculante', zanzariera: 'Zanzariera', persiana: 'Persiana' };
      return `${labels[top[0]] || top[0]}: ${Math.round((top[1] as number) / sent.length * 100)}%`;
    },
  },
];

function BusinessIndicesCard({ measurements }: { measurements: MeasurementRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" />
          Indici Aziendali
        </CardTitle>
        <CardDescription>Indicatori chiave di performance calcolati sui dati reali</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUSINESS_INDICES.map(idx => (
            <div key={idx.name} className="rounded-xl border border-border p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">{idx.name}</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="rounded-full p-0.5 hover:bg-muted transition-colors">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 text-xs space-y-2" side="top">
                    <p className="font-semibold text-foreground">{idx.name}</p>
                    <p className="text-muted-foreground">{idx.desc}</p>
                    <p className="text-accent font-medium">Valore ideale: {idx.ideal}</p>
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-lg font-bold font-heading text-foreground">{idx.calc(measurements)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
