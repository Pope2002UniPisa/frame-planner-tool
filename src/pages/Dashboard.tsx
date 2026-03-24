import { useEffect, useState, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, LogOut, Ruler, CheckCircle, FileText, Package, Send, Edit3, Search, Filter, Printer, Eye, Newspaper, User, Calendar, ExternalLink, Facebook, Instagram, Linkedin } from 'lucide-react';

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
  porta: 'Porta',
  basculante: 'Basculante',
  zanzariera: 'Zanzariera',
  persiana: 'Persiana',
};

const productIcons: Record<string, { emoji: string; color: string }> = {
  finestra: { emoji: '🪟', color: '#3b82f6' },
  porta_finestra: { emoji: '🚪', color: '#8b5cf6' },
  porta: { emoji: '🚪', color: '#a855f7' },
  basculante: { emoji: '🏗️', color: '#f97316' },
  zanzariera: { emoji: '🦟', color: '#10b981' },
  persiana: { emoji: '🪵', color: '#f59e0b' },
};

interface NewsItem {
  id: number;
  date: string;
  title: string;
  tag: string;
  summary: string;
  image?: string;
  link?: string;
}

const NEWS_ITEMS: NewsItem[] = [
  { id: 1, date: '2026-03-20', title: 'Sconto in fattura 50% – Prorogato fino a giugno 2026', tag: 'Agevolazione', summary: 'Il governo ha prorogato lo sconto in fattura al 50% per la sostituzione degli infissi fino a giugno 2026. Approfitta subito di questa agevolazione per i tuoi clienti.', link: '#' },
  { id: 2, date: '2026-03-15', title: 'Nuovo modello Finestra EcoPlus: isolamento termico superiore', tag: 'Nuovo prodotto', summary: 'La nuova finestra EcoPlus garantisce un isolamento termico del 40% superiore rispetto ai modelli precedenti, con un design minimalista e materiali ecosostenibili.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=250&fit=crop' },
  { id: 3, date: '2026-03-10', title: 'Conto Termico 2.0: come accedere agli incentivi', tag: 'Agevolazione', summary: 'Guida completa per accedere agli incentivi del Conto Termico 2.0 per la sostituzione degli infissi. Documentazione necessaria e procedura passo-passo.', link: '#' },
  { id: 4, date: '2026-03-05', title: 'Tapparelle motorizzate: promozione -15% fino ad aprile', tag: 'Promozione', summary: 'Promozione speciale su tutte le tapparelle motorizzate Somfy. Sconto del 15% valido fino al 30 aprile 2026.', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=250&fit=crop' },
];

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

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

  const filteredMeasurements = useMemo(() => {
    return measurements.filter(m => {
      if (filterStatus !== 'all') {
        if (filterStatus === 'bozza' && m.status !== 'bozza') return false;
        if (filterStatus === 'inviata' && m.status !== 'ricevuto' && m.status !== 'submitted') return false;
        if (filterStatus === 'quoted' && m.status !== 'quoted') return false;
        if (filterStatus === 'completed' && m.status !== 'completed' && m.status !== 'ordered') return false;
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

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
        {/* News Section - clickable cards */}
        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-heading flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-accent" />
              Novità e Promozioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {NEWS_ITEMS.map(n => (
                <div
                  key={n.id}
                  onClick={() => setSelectedNews(n)}
                  className="rounded-xl border border-border overflow-hidden hover:shadow-card-hover transition-all cursor-pointer group"
                >
                  {n.image && (
                    <div className="h-32 overflow-hidden">
                      <img src={n.image} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">{n.tag}</Badge>
                      {n.link && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug mb-2">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.summary}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(n.date).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* News Dialog */}
        <Dialog open={!!selectedNews} onOpenChange={open => !open && setSelectedNews(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">{selectedNews?.title}</DialogTitle>
            </DialogHeader>
            {selectedNews?.image && (
              <img src={selectedNews.image} alt={selectedNews.title} className="w-full h-48 object-cover rounded-lg" />
            )}
            <div className="space-y-3">
              <Badge variant="secondary">{selectedNews?.tag}</Badge>
              <p className="text-sm text-foreground leading-relaxed">{selectedNews?.summary}</p>
              <p className="text-xs text-muted-foreground">{selectedNews && new Date(selectedNews.date).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              {selectedNews?.link && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={selectedNews.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Leggi articolo completo
                  </a>
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard icon={FileText} label="Totale" value={stats.total} />
          <StatCard icon={Edit3} label="Bozze" value={stats.drafts} />
          <StatCard icon={Send} label="Inviate" value={stats.sent} />
          <StatCard icon={Package} label="Preventivate" value={stats.quoted} />
          <StatCard icon={CheckCircle} label="Completate" value={stats.completed} />
        </div>

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

        {/* Measurements list with filters */}
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
                  <SelectItem value="inviata">Inviate</SelectItem>
                  <SelectItem value="quoted">Preventivate</SelectItem>
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
                return (
                  <Card key={m.id} className="transition-shadow hover:shadow-card-hover">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="hidden sm:flex items-center justify-center rounded-lg p-3" style={{ backgroundColor: `${pi.color}15` }}>
                        <span className="text-xl">{pi.emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pi.color }} />
                          <span className="font-semibold text-foreground">{productLabels[m.product_type] || m.product_type}</span>
                          <Badge variant={statusLabels[m.status]?.variant || 'default'}>
                            {statusLabels[m.status]?.label || m.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {m.width_mm}×{m.height_mm} mm • {m.client_name || 'Senza nome'}
                        </p>
                        {m.client_address && <p className="text-xs text-muted-foreground">{m.client_address}</p>}
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-8">
        <div className="container py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="rounded-lg gradient-accent p-1.5">
                  <Ruler className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="font-heading font-bold text-foreground">Measure Master</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Portale professionale per la gestione delle misurazioni e configurazione di infissi.
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground mb-3">Informazioni legali</p>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>Ragione Sociale SRL</p>
                <p>P.IVA: IT00000000000</p>
                <p>Sede: Via Esempio 1, 00100 Roma (RM)</p>
                <p>PEC: info@pec.azienda.it</p>
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
            © {new Date().getFullYear()} Measure Master — Tutti i diritti riservati
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
