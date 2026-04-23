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
import { Plus, LogOut, Ruler, CheckCircle, FileText, Package, Send, Edit3, Search, Filter, Printer, Eye, Newspaper, User, Calendar, CalendarDays, ExternalLink, Facebook, Instagram, Linkedin, Camera, Shield, Users, ArrowRight, Truck, CreditCard, ThumbsUp, MessageSquare, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import pratelliLogo from '@/assets/pratelli-logo.png';
import { productLabels, statusLabels, WORKFLOW_STEPS, getWorkflowIndex, productIcons } from '@/lib/constants';
import { NotificationBell } from '@/components/NotificationBell';
import { createNotification } from '@/lib/notifications';

interface NewsItem {
  id: string;
  created_at: string;
  title: string;
  tag: string;
  summary: string;
  image_url?: string | null;
  image_position?: string | null;
  link?: string | null;
  social_link?: string | null;
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
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [calendarAppointments, setCalendarAppointments] = useState<
    Array<{
      id: string;
      user_id?: string;
      date: string;
      type: string;
      title: string;
      time: string | null;
      location: string | null;
      description: string | null;
      color: string | null;
    }>
  >([]);

  const [addMode, setAddMode] = useState(false);
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const [appointmentForm, setAppointmentForm] = useState({
    type: 'consegna',
    title: '',
    time: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: mData }, { data: pData }, { data: nData }, { data: pfData }, { data: aData }] = await Promise.all([
        supabase
          .from('measurements')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('news')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('portfolio_images')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('appointments')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: true }),
      ]);
      setMeasurements(mData || []);
      setProfile(pData);
      setNewsItems(nData || []);
      setPortfolioImages(pfData || []);
      setCalendarAppointments(aData || []);
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
  {/* Stato accettazione preventivo e workflow conseguente */ }
  const handleQuoteResponse = async (measurementId: string, accept: boolean) => {
    const newStatus = accept ? 'quote_accepted' : 'quote_modifications';
    const updates: any = { status: newStatus };
    if (!accept && modificationNotes) {
      updates.modification_notes = modificationNotes;
      updates.has_modification = true;
    }
    const { error } = await supabase.from('measurements').update(updates).eq('id', measurementId);
    if (error) { toast.error(error.message); return; }

    const measurement = measurements.find(m => m.id === measurementId);
    setMeasurements(prev => prev.map(m => m.id === measurementId ? { ...m, ...updates } : m));
    setQuoteResponseDialog(null);
    setModificationNotes('');
    toast.success(accept ? 'Preventivo accettato! L\'ordine verrà confermato a breve.' : 'Richiesta di modifiche inviata.');

    if (user && measurement) {
      const label = accept ? 'Preventivo accettato' : 'Modifiche richieste';
      createNotification({
        userId: user.id,
        type: 'status',
        title: `🔄 ${label}: ${measurement.client_name}`,
        body: `${productLabels[measurement.product_type] || measurement.product_type}${accept ? '' : modificationNotes ? ` — ${modificationNotes}` : ''}`,
        whatsapp: true,
        whatsappMessage: `🔄 *${label}*\nCliente: ${measurement.client_name}\nProdotto: ${productLabels[measurement.product_type] || measurement.product_type}${!accept && modificationNotes ? `\nNote: ${modificationNotes}` : ''}`,
      });
    }
  };

  const APPOINTMENT_TYPES: Record<string, { label: string; color: string }> = {
    consegna: { label: 'Consegna', color: '#f59e0b' },   // giallo/arancio
    chiamata: { label: 'Chiamata', color: '#10b981' },   // verde
    pagamento: { label: 'Pagamento', color: '#ef4444' }, // rosso
    sopralluogo: { label: 'Sopralluogo', color: '#3b82f6' }, // blu
    altro: { label: 'Altro', color: '#8b5cf6' },         // viola
  };

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Lunedì = 0 ... Domenica = 6
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;

  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - startWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return new Date(year, month, dayNumber);
  });

  const getAppointmentsForDay = (date: Date) => {
    const key = formatDateKey(date);
    return calendarAppointments.filter(a => a.date === key);
  };

  const openAppointmentDialog = (date: Date) => {
    setSelectedDay(date);
    setAppointmentForm({
      type: 'consegna',
      title: '',
      time: '',
      location: '',
      description: '',
    });
    setAppointmentDialogOpen(true);
  };

  const handleSaveAppointment = async () => {
    if (!selectedDay || !appointmentForm.title.trim() || !user) return;

    const typeConfig = APPOINTMENT_TYPES[appointmentForm.type];

    const newAppointment = {
      user_id: user.id,
      date: formatDateKey(selectedDay),
      type: appointmentForm.type,
      title: appointmentForm.title.trim(),
      time: appointmentForm.time || null,
      location: appointmentForm.location.trim() || null,
      description: appointmentForm.description.trim() || null,
      color: typeConfig.color,
    };

    const { data, error } = await supabase
      .from('appointments')
      .insert(newAppointment)
      .select()
      .single();

    if (error) {
      toast.error('Errore nel salvataggio dell\'appuntamento');
      return;
    }

    setCalendarAppointments(prev => [...prev, data]);
    setAppointmentDialogOpen(false);
    setSelectedDay(null);
    setAppointmentForm({ type: 'consegna', title: '', time: '', location: '', description: '' });
    toast.success('Appuntamento salvato');

    // Notifica in-app + WhatsApp
    createNotification({
      userId: user.id,
      type: 'appointment',
      title: `📅 Nuovo appuntamento: ${newAppointment.title}`,
      body: `${newAppointment.date}${newAppointment.time ? ' alle ' + newAppointment.time : ''}${newAppointment.location ? ' — ' + newAppointment.location : ''}`,
      whatsapp: true,
      whatsappMessage: `📅 *Nuovo appuntamento salvato*\n*${newAppointment.title}*\nData: ${newAppointment.date}${newAppointment.time ? '\nOra: ' + newAppointment.time : ''}${newAppointment.location ? '\nLuogo: ' + newAppointment.location : ''}`,
    });
  };

  const handleDeleteAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast.error('Errore nella cancellazione');
      return;
    }
    setCalendarAppointments(prev => prev.filter(a => a.id !== id));
    toast.success('Appuntamento eliminato');
  };

  const goToPreviousMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };


  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card shadow-card relative">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pratelliLogo} alt="Pratelli Rappresentanze" className="h-12 object-contain" />
            {profile && (
              <div className="flex items-center gap-2">
                {profile.logo_url && (
                  <img src={profile.logo_url} alt={profile.company_name} className="h-8 w-8 rounded-md object-contain border border-border" />
                )}
                <h1 className="text-lg font-bold font-heading text-foreground">{profile.company_name || user.email}</h1>
              </div>
            )}
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none select-none">
            <span className="text-xl font-mono font-bold text-foreground tabular-nums tracking-widest">{clock}</span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" size="icon" onClick={() => navigate('/admin')} title="Admin">
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <NotificationBell />
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
        {/* News + Calendario */}
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
          {/* Colonna sinistra: Novità e Promozioni */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Newspaper className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-heading font-semibold text-foreground">
                    Novità e Promozioni
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {newsItems.slice(0, 8).map(n => (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNews(n)}
                      className="rounded-lg border border-border p-3 hover:shadow-card-hover transition-all cursor-pointer group"
                    >
                      {n.image_url && (
                        <img
                          src={n.image_url}
                          alt={n.title}
                          className="w-full h-20 object-cover rounded-md mb-2"
                          style={{ objectPosition: n.image_position || '50% 50%' }}
                        />
                      )}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {n.tag}
                        </Badge>
                        {n.link && <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />}
                        {n.social_link && <Instagram className="h-2.5 w-2.5 text-muted-foreground" />}
                      </div>

                      <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                        {n.title}
                      </p>

                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  ))}

                  {newsItems.length === 0 && (
                    <p className="col-span-2 text-xs text-muted-foreground text-center py-4">
                      Nessuna novità al momento.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonna destra: Calendario */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardContent className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-heading font-semibold text-foreground">
                    Calendario
                  </h3>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <p className="text-sm font-semibold text-foreground">
                    {monthNames[month]} {year}
                  </p>

                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 rounded-xl border border-border bg-muted/20 p-4 flex flex-col">
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-2">
                    <div>L</div>
                    <div>M</div>
                    <div>M</div>
                    <div>G</div>
                    <div>V</div>
                    <div>S</div>
                    <div>D</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarCells.map((date, i) => {
                      if (!date) {
                        return <div key={i} className="aspect-square" />;
                      }

                      const dayAppointments = getAppointmentsForDay(date);
                      const firstColor = dayAppointments[0]?.color;
                      const isSelected =
                        selectedDay && formatDateKey(selectedDay) === formatDateKey(date);

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (addMode) {
                              setAddMode(false);
                              openAppointmentDialog(date);
                            } else {
                              setSelectedDay(date);
                            }
                          }}
                          className={`aspect-square rounded-md border text-[11px] flex flex-col items-center justify-center transition-colors relative ${addMode ? 'cursor-crosshair' : ''} ${isSelected
                            ? 'border-accent bg-accent/10'
                            : 'border-border/50 bg-background hover:border-accent hover:bg-accent/5'
                            }`}
                          style={
                            firstColor
                              ? {
                                boxShadow: `inset 0 0 0 2px ${firstColor}`,
                              }
                              : undefined
                          }
                        >
                          <span className="text-muted-foreground">{date.getDate()}</span>

                          {dayAppointments.length > 0 && (
                            <div className="absolute bottom-1 flex items-center gap-1">
                              {dayAppointments.slice(0, 3).map((appt, idx) => (
                                <span
                                  key={idx}
                                  className="h-1.5 w-1.5 rounded-full"
                                  style={{ backgroundColor: appt.color ?? undefined }}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-center mt-3">
                    <button
                      type="button"
                      onClick={() => setAddMode(prev => !prev)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${addMode ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent'}`}
                      title="Aggiungi appuntamento"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {addMode ? 'Seleziona un giorno…' : 'Aggiungi'}
                    </button>
                  </div>

                  <div className="mt-3">
                    {selectedDay ? (
                      <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-semibold text-foreground mb-2">
                          {selectedDay.toLocaleDateString('it-IT', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>

                        {getAppointmentsForDay(selectedDay).length > 0 ? (
                          <div className="space-y-2">
                            {getAppointmentsForDay(selectedDay).map(appt => (
                              <div
                                key={appt.id}
                                className="rounded-md border border-border p-2"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: appt.color ?? undefined }}
                                  />
                                  <span className="text-xs font-semibold text-foreground flex-1">
                                    {appt.title}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteAppointment(appt.id)}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                    title="Elimina appuntamento"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <p className="text-[11px] text-muted-foreground">
                                  {APPOINTMENT_TYPES[appt.type]?.label}
                                  {appt.time ? ` • ${appt.time}` : ''}
                                </p>

                                {appt.location && (
                                  <p className="text-[11px] text-muted-foreground">
                                    {appt.location}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Nessun appuntamento per questo giorno.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                        Clicca su un giorno per aggiungere o vedere appuntamenti.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
{/* Appointment Dialog */}
        <Dialog open={appointmentDialogOpen} onOpenChange={(open) => { setAppointmentDialogOpen(open); if (!open) setAddMode(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">
                Nuovo appuntamento
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {selectedDay?.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={appointmentForm.type}
                  onValueChange={(value) =>
                    setAppointmentForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consegna">Consegna</SelectItem>
                    <SelectItem value="chiamata">Chiamata</SelectItem>
                    <SelectItem value="pagamento">Pagamento</SelectItem>
                    <SelectItem value="sopralluogo">Sopralluogo</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Titolo</label>
                <Input
                  value={appointmentForm.title}
                  onChange={(e) =>
                    setAppointmentForm(prev => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Es. Consegna infissi"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Orario</label>
                <Input
                  type="time"
                  value={appointmentForm.time}
                  onChange={(e) =>
                    setAppointmentForm(prev => ({ ...prev, time: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Luogo</label>
                <Input
                  value={appointmentForm.location}
                  onChange={(e) =>
                    setAppointmentForm(prev => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="Es. Via Roma 12, Pisa"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrizione</label>
                <Textarea
                  rows={3}
                  value={appointmentForm.description}
                  onChange={(e) =>
                    setAppointmentForm(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Breve descrizione..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAppointmentDialogOpen(false)}>
                Annulla
              </Button>
              <Button onClick={handleSaveAppointment} disabled={!appointmentForm.title.trim()}>
                Salva appuntamento
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
                          {productLabels[m.product_type] || m.product_type} • {m.width_mm}×{m.height_mm} mm
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
                                  <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[8px] ${isCurrent ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' :
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
                        {['ricevuto', 'submitted', 'quoted'].includes(m.status) && (
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
{/* Company info and logo */}
            <div>
              <div className="flex items-center gap-2 mb-3 -ml-3.5">
                <img src={pratelliLogo}
                  alt="Pratelli Rappresentanze"
                  className="h-16 object-contain"
                />
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
                <a
                  href="https://www.facebook.com/pratellirappresentanze?locale=it_IT"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Seguici su Facebook"
                  className="rounded-lg bg-muted p-2 hover:bg-accent/10 transition-colors"
                >
                  <Facebook className="h-4 w-4 text-muted-foreground" />
                </a>
                <a
                  href="https://www.instagram.com/pratellirappresentanze/?hl=it"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Seguici su Instagram"
                  className="rounded-lg bg-muted p-2 hover:bg-accent/10 transition-colors"
                >
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                </a>
                <a href="https://www.linkedin.com/company/pratellirappresentanze/posts/?feedView=all"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Seguici su Linkedin"
                  className="rounded-lg bg-muted p-2 hover:bg-accent/10 transition-colors">
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