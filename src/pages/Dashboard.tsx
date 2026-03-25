import { useEffect, useState, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, LogOut, Ruler, CheckCircle, FileText, Package, Send, Edit3, Search, Filter, Printer, Eye, Newspaper, User, Calendar, ExternalLink, Facebook, Instagram, Linkedin, Camera, Shield, Users, ArrowRight, Truck, CreditCard, ThumbsUp, MessageSquare } from 'lucide-react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import pratelliLogo from '@/assets/pratelli-logo.png';


const WORKFLOW_STEPS = [
  { key: 'bozza', label: 'Bozza', icon: '📝' },
  { key: 'quoted', label: 'Preventivo', icon: '💰' },
  { key: 'ordered', label: 'Ordine', icon: '📋' },
  { key: 'in_production', label: 'Produzione', icon: '✅' },
  { key: 'delivering', label: 'Consegna', icon: '📦' },
  { key: 'completed', label: 'Completata', icon: '🏁' },
];

const getWorkflowIndex = (status: string): number => {
  const map: Record<string, number> = { bozza: 0, ricevuto: 1, submitted: 1, quoted: 1, quote_accepted: 1, quote_modifications: 1, ordered: 2, in_production: 3, delivering: 4, completed: 5 };
  return map[status] ?? 0;
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  bozza: { label: 'Bozza', variant: 'outline' },
  ricevuto: { label: 'Preventivo', variant: 'default' },
  submitted: { label: 'Preventivo', variant: 'default' },
  in_review: { label: 'In revisione', variant: 'secondary' },
  quoted: { label: 'Preventivo', variant: 'default' },
  quote_accepted: { label: 'Preventivo accettato', variant: 'default' },
  quote_modifications: { label: 'Modifiche richieste', variant: 'destructive' },
  ordered: { label: 'Ordinata', variant: 'secondary' },
  in_production: { label: 'In produzione', variant: 'default' },
  delivering: { label: 'In consegna', variant: 'default' },
  completed: { label: 'Completata', variant: 'secondary' },
};

const productLabels: Record<string, string> = {
  finestra: 'Finestra',
  porta_finestra: 'Porta Finestra',
  porta: 'Porta',
  porta_finestrata: 'Porta Finestrata',
  porta_filomuro: 'Porta Filomuro',
  basculante: 'Basculante',
  zanzariera: 'Zanzariera',
  persiana: 'Persiana',
  battiscopa: 'Battiscopa',
  maniglia: 'Maniglia',
};

const productIcons: Record<string, { emoji: string; color: string }> = {
  finestra: { emoji: '🪟', color: '#3b82f6' },
  porta_finestra: { emoji: '🚪', color: '#8b5cf6' },
  porta: { emoji: '🚪', color: '#a855f7' },
  porta_finestrata: { emoji: '🚪', color: '#7c3aed' },
  porta_filomuro: { emoji: '🚪', color: '#6d28d9' },
  basculante: { emoji: '🏗️', color: '#f97316' },
  zanzariera: { emoji: '🦟', color: '#10b981' },
  persiana: { emoji: '🪵', color: '#f59e0b' },
  battiscopa: { emoji: '🪵', color: '#a16207' },
  maniglia: { emoji: '🔩', color: '#64748b' },
};

interface NewsItem {
  id: string;
  created_at: string;
  title: string;
  tag: string;
  summary: string;
  image_url?: string;
  link?: string;
  social_link?: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<PortfolioItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [quoteResponseDialog, setQuoteResponseDialog] = useState<any>(null);
  const [modificationNotes, setModificationNotes] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: mData }, { data: pData }, { data: nData }, { data: pfData }] = await Promise.all([
        supabase.from('measurements').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('news').select('*').order('created_at', { ascending: false }),
        supabase.from('portfolio_images').select('*').order('sort_order', { ascending: true }),
      ]);
      setMeasurements(mData || []);
      setProfile(pData);
      setNewsItems(nData || []);
      setPortfolioImages(pfData || []);
      setLoadingData(false);
    };
    fetchData();
  }, [user]);

  const stats = useMemo(() => ({
    total: measurements.length,
    drafts: measurements.filter(m => m.status === 'bozza').length,
    quoted: measurements.filter(m => ['ricevuto', 'submitted', 'quoted', 'quote_accepted', 'quote_modifications'].includes(m.status)).length,
    ordered: measurements.filter(m => ['ordered', 'in_production', 'delivering'].includes(m.status)).length,
    completed: measurements.filter(m => m.status === 'completed').length,
  }), [measurements]);

  const clientSummaryCount = useMemo(() => {
    const names = new Set(measurements.map(m => (m.client_name || 'Senza nome').trim()));
    return names.size;
  }, [measurements]);

  const filteredMeasurements = useMemo(() => {
    return measurements.filter(m => {
      if (filterStatus !== 'all') {
        if (filterStatus === 'bozza' && m.status !== 'bozza') return false;
        if (filterStatus === 'quoted' && !['ricevuto', 'submitted', 'quoted', 'quote_accepted', 'quote_modifications'].includes(m.status)) return false;
        if (filterStatus === 'ordered' && !['ordered', 'in_production', 'delivering'].includes(m.status)) return false;
        if (filterStatus === 'completed' && m.status !== 'completed') return false;
      }
      if (filterProduct !== 'all' && m.product_type !== filterProduct) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        if (!((m.client_name || '').toLowerCase().includes(s) || (m.client_address || '').toLowerCase().includes(s))) return false;
      }
      if (filterDateFrom && new Date(m.created_at) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(m.created_at) > new Date(filterDateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [measurements, filterStatus, filterProduct, searchText, filterDateFrom, filterDateTo]);

  const handleQuoteResponse = async (measurementId: string, accept: boolean) => {
    const newStatus = accept ? 'quote_accepted' : 'quote_modifications';
    const updates: any = { status: newStatus };
    if (!accept && modificationNotes) {
      updates.modification_notes = modificationNotes;
      updates.has_modification = true;
    }
    const { error } = await supabase.from('measurements').update(updates).eq('id', measurementId);
    if (error) { toast.error(error.message); return; }
    setMeasurements(prev => prev.map(m => m.id === measurementId ? { ...m, ...updates } : m));
    setQuoteResponseDialog(null);
    setModificationNotes('');
    toast.success(accept ? 'Preventivo accettato! L\'ordine verrà confermato a breve.' : 'Richiesta di modifiche inviata.');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pratelliLogo} alt="Pratelli Rappresentanze" className="h-12 object-contain" />
            {profile && <h1 className="text-lg font-bold font-heading text-foreground">{profile.company_name || user.email}</h1>}
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" size="icon" onClick={() => navigate('/admin')} title="Admin">
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => navigate('/profilo')} title="Profilo">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 flex-1">
        {/* News Section - compact */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Newspaper className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-heading font-semibold text-foreground">Novità e Promozioni</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {newsItems.map(n => (
              <div
                key={n.id}
                onClick={() => setSelectedNews(n)}
                className="rounded-lg border border-border p-3 hover:shadow-card-hover transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{n.tag}</Badge>
                  {n.link && <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />}
                  {n.social_link && <Instagram className="h-2.5 w-2.5 text-muted-foreground" />}
                </div>
                <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{n.title}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString('it-IT')}</p>
              </div>
            ))}
            {newsItems.length === 0 && (
              <p className="col-span-4 text-xs text-muted-foreground text-center py-4">Nessuna novità al momento.</p>
            )}
          </div>
        </div>

        {/* News Dialog */}
        <Dialog open={!!selectedNews} onOpenChange={open => !open && setSelectedNews(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">{selectedNews?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Badge variant="secondary">{selectedNews?.tag}</Badge>
              {selectedNews?.image_url && <img src={selectedNews.image_url} alt="" className="w-full rounded-lg" />}
              <p className="text-sm text-foreground leading-relaxed">{selectedNews?.summary}</p>
              <p className="text-xs text-muted-foreground">{selectedNews && new Date(selectedNews.created_at).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <div className="flex gap-2">
                {selectedNews?.link && (
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={selectedNews.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Leggi articolo
                    </a>
                  </Button>
                )}
                {selectedNews?.social_link && (
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={selectedNews.social_link} target="_blank" rel="noopener noreferrer">
                      <Instagram className="h-3.5 w-3.5" /> Vedi post social
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Photo preview dialog */}
        <Dialog open={!!selectedPhoto} onOpenChange={open => !open && setSelectedPhoto(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-heading">Foto misurazione</DialogTitle>
            </DialogHeader>
            {selectedPhoto && (
              <img src={selectedPhoto} alt="Foto misurazione" className="w-full rounded-lg" />
            )}
          </DialogContent>
        </Dialog>

        {/* Quote modifications dialog */}
        <Dialog open={!!quoteResponseDialog} onOpenChange={open => { if (!open) { setQuoteResponseDialog(null); setModificationNotes(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Richiedi modifiche al preventivo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Descrivi le modifiche che desideri apportare al preventivo. Il team le valuterà e ti invierà un nuovo preventivo aggiornato.</p>
              <Textarea
                value={modificationNotes}
                onChange={e => setModificationNotes(e.target.value)}
                placeholder="Descrivi le modifiche richieste..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setQuoteResponseDialog(null); setModificationNotes(''); }}>Annulla</Button>
              <Button onClick={() => quoteResponseDialog && handleQuoteResponse(quoteResponseDialog.id, false)} disabled={!modificationNotes.trim()}>
                Invia richiesta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard icon={FileText} label="Totale" value={stats.total} />
          <StatCard icon={Edit3} label="Bozze" value={stats.drafts} />
          <StatCard icon={Send} label="Preventivi" value={stats.quoted} />
          <StatCard icon={Package} label="Ordini" value={stats.ordered} />
          <StatCard icon={CheckCircle} label="Completate" value={stats.completed} />
        </div>

        {/* CTA */}
        <Card className="mb-6 gradient-primary border-0">
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
            <div className="flex-1">
              <h2 className="text-xl font-bold font-heading text-primary-foreground">Inserisci una nuova misurazione</h2>
              <p className="mt-1 text-sm text-primary-foreground/70">Compila il form guidato per inviare le misure.</p>
            </div>
            <Link to="/nuova-misurazione">
              <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-5 w-5" />
                Inizia ora
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Riepilogo Clienti - pagina dedicata */}
        <Card className="mb-6 border-2 border-primary/20 bg-primary/5 shadow-md">
          <CardContent className="flex items-center justify-between py-5 px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg gradient-primary p-2.5">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground font-heading">Riepilogo Clienti</p>
              </div>
            </div>
            <Button onClick={() => navigate('/dashboard/clienti')} className="gap-2">
              Apri riepilogo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Riepilogo Consegne - pagina dedicata */}
        <Card className="mb-6 border-2 border-accent/20 bg-accent/5 shadow-md">
          <CardContent className="flex items-center justify-between py-5 px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg gradient-accent p-2.5">
                <Truck className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground font-heading">Riepilogo Consegne</p>
              </div>
            </div>
            <Button onClick={() => navigate('/dashboard/consegne')} className="gap-2">
              Apri riepilogo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Riepilogo Pagamenti - pagina dedicata */}
        <Card className="mb-6 border-2 border-green-500/20 bg-green-500/5 shadow-md">
          <CardContent className="flex items-center justify-between py-5 px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/10 p-2.5">
                <CreditCard className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground font-heading">Riepilogo Pagamenti</p>
              </div>
            </div>
            <Button onClick={() => navigate('/dashboard/pagamenti')} className="gap-2">
              Apri riepilogo
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-xl font-bold font-heading text-foreground">Le tue misurazioni</h2>

          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Cerca per cliente o indirizzo..." className="pl-10" value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="bozza">Bozze</SelectItem>
                  <SelectItem value="quoted">Preventivi</SelectItem>
                  <SelectItem value="ordered">Ordini</SelectItem>
                  <SelectItem value="completed">Completate</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProduct} onValueChange={setFilterProduct}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i prodotti</SelectItem>
                  <SelectItem value="finestra">Finestra</SelectItem>
                  <SelectItem value="porta">Porta</SelectItem>
                  <SelectItem value="porta_finestra">Porta Finestra</SelectItem>
                  <SelectItem value="basculante">Basculante</SelectItem>
                  <SelectItem value="zanzariera">Zanzariera</SelectItem>
                  <SelectItem value="persiana">Persiana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <Input type="date" className="w-[150px]" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                <span className="text-muted-foreground text-sm">—</span>
                <Input type="date" className="w-[150px]" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
              </div>
              {(searchText || filterStatus !== 'all' || filterProduct !== 'all' || filterDateFrom || filterDateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setSearchText(''); setFilterStatus('all'); setFilterProduct('all'); setFilterDateFrom(''); setFilterDateTo(''); }}>
                  Cancella filtri
                </Button>
              )}
            </div>
          </div>

          {loadingData ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : filteredMeasurements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Ruler className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {measurements.length === 0 ? 'Nessuna misurazione ancora. Inizia inserendone una!' : 'Nessuna misurazione corrisponde ai filtri selezionati.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMeasurements.map(m => {
                const pi = productIcons[m.product_type] || { emoji: '📦', color: '#6b7280' };
                const photos: string[] = m.photo_urls || [];
                const isGrouped = !!(m as any).order_group_id;
                const itemIndex = (m as any).order_item_index;
                const totalItems = (m as any).order_total_items;
                return (
                  <Card key={m.id} className={`transition-shadow hover:shadow-card-hover ${isGrouped ? 'border-l-4' : ''}`} style={isGrouped ? { borderLeftColor: pi.color } : undefined}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="hidden sm:flex items-center justify-center rounded-lg p-3" style={{ backgroundColor: `${pi.color}15` }}>
                        <span className="text-xl">{pi.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pi.color }} />
                          <span className="font-semibold text-foreground">{m.client_name || 'Senza nome'}</span>
                          <Badge variant={statusLabels[m.status]?.variant || 'default'}>
                            {statusLabels[m.status]?.label || m.status}
                          </Badge>
                          {isGrouped && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              📦 {itemIndex}/{totalItems}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {m.width_mm}×{m.height_mm} mm • {m.client_name || 'Senza nome'}
                        </p>
                        {m.client_address && <p className="text-xs text-muted-foreground">{m.client_address}</p>}
                        {(m as any).estimated_price > 0 && (
                          <p className="text-xs font-medium text-accent mt-0.5">Prezzo stimato: €{Number((m as any).estimated_price).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                        )}
                        {photos.length > 0 && (
                          <div className="flex gap-1.5 mt-2">
                            {photos.slice(0, 4).map((url: string, i: number) => (
                              <div
                                key={i}
                                className="w-10 h-10 rounded border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all"
                                onClick={(e) => { e.stopPropagation(); setSelectedPhoto(url); }}
                              >
                                <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {photos.length > 4 && (
                              <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                +{photos.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Workflow tracker */}
                        {m.status !== 'bozza' && (
                          <div className="flex items-center gap-0.5 mt-2">
                            {WORKFLOW_STEPS.slice(1).map((ws, idx) => {
                              const currentIdx = getWorkflowIndex(m.status);
                              const stepIdx = idx + 1;
                              const isActive = stepIdx <= currentIdx;
                              const isCurrent = stepIdx === currentIdx;
                              return (
                                <div key={ws.key} className="flex items-center gap-0.5">
                                  <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[8px] ${
                                    isCurrent ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' :
                                    isActive ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
                                  }`} title={ws.label}>
                                    {ws.icon}
                                  </div>
                                  {idx < WORKFLOW_STEPS.length - 2 && (
                                    <div className={`w-3 h-0.5 ${isActive ? 'bg-accent/40' : 'bg-muted'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Quote response buttons */}
                        {m.status === 'quoted' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); handleQuoteResponse(m.id, true); }}>
                              <ThumbsUp className="h-3.5 w-3.5" /> Accetta preventivo
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={(e) => { e.stopPropagation(); setQuoteResponseDialog(m); }}>
                              <MessageSquare className="h-3.5 w-3.5" /> Richiedi modifiche
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {m.status === 'bozza' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/misurazione/${m.id}/modifica`)} title="Modifica">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/misurazione/${m.id}/stampa`)} title="Stampa/PDF">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/misurazione/${m.id}`)} title="Visualizza">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(m.created_at).toLocaleDateString('it-IT')}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Portfolio / Lavori svolti */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold font-heading text-foreground">I nostri lavori</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {portfolioImages.map(img => (
              <div
                key={img.id}
                className="group rounded-xl overflow-hidden border border-border cursor-pointer hover:shadow-card-hover transition-all"
                onClick={() => setSelectedPhoto(img.image_url)}
              >
                <div className="aspect-square overflow-hidden">
                  <img src={img.image_url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{img.title}</p>
                  <p className="text-[10px] text-muted-foreground">{img.description}</p>
                </div>
              </div>
            ))}
            {portfolioImages.length === 0 && (
              <p className="col-span-4 text-xs text-muted-foreground text-center py-4">Nessuna immagine nel portfolio.</p>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-8">
        <div className="container py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={pratelliLogo} alt="Pratelli Rappresentanze" className="h-10 object-contain" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Portale professionale per la gestione delle misurazioni e configurazione di infissi.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground mb-3">Informazioni legali</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>FAREWELL SRL</p>
                <p>P. IVA: 02484510504</p>
                <p>Sede: Via Livornese Ovest 22/A - 56035 - Casciana Terme Lari (PI)</p>
                <p>PEC: farewellsrl@pec.cgn.it</p>
              </div>
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground mb-3">Seguici</p>
              <div className="flex items-center gap-3">
                <a href="#" className="rounded-lg bg-muted p-2 hover:bg-accent/10 transition-colors">
                  <Facebook className="h-4 w-4 text-muted-foreground" />
                </a>
                <a href="#" className="rounded-lg bg-muted p-2 hover:bg-accent/10 transition-colors">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                </a>
                <a href="#" className="rounded-lg bg-muted p-2 hover:bg-accent/10 transition-colors">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                </a>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <a href="#" className="hover:text-foreground transition-colors block">Privacy Policy</a>
                <a href="#" className="hover:text-foreground transition-colors block">Cookie Policy</a>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} FAREWELL SRL — Tutti i diritti riservati
          </div>
        </div>
      </footer>
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
