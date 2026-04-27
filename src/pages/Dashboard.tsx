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
import {
  Plus, Ruler, CheckCircle, FileText, Package, Send, Edit3, Search, Filter,
  Printer, Eye, Newspaper, Calendar, CalendarDays, ExternalLink, Instagram,
  Camera, Truck, ThumbsUp, MessageSquare, Maximize2, Smartphone,
  ChevronLeft, ChevronRight, Trash2, TrendingUp, MapPin, Facebook, Linkedin,
} from 'lucide-react';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { toast } from 'sonner';
import { productLabels, statusLabels, WORKFLOW_STEPS, getWorkflowIndex, productIcons } from '@/lib/constants';
import { NotificationBell } from '@/components/NotificationBell';
import { createNotification } from '@/lib/notifications';
import { AppSidebar } from '@/components/AppSidebar';
import { AppointmentMap } from '@/components/AppointmentMap';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface NewsItem {
  id: string; created_at: string; title: string; tag: string;
  summary: string; image_url?: string | null; image_position?: string | null;
  link?: string | null; social_link?: string | null;
}
interface PortfolioItem { id: string; title: string; description: string; image_url: string; }

const APPOINTMENT_TYPES: Record<string, { label: string; color: string }> = {
  consegna: { label: 'Consegna', color: '#f59e0b' },
  chiamata: { label: 'Chiamata', color: '#10b981' },
  pagamento: { label: 'Pagamento', color: '#ef4444' },
  sopralluogo: { label: 'Sopralluogo', color: '#3b82f6' },
  altro: { label: 'Altro', color: '#8b5cf6' },
};

const monthNames = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
    Array<{ id: string; user_id?: string; date: string; type: string; title: string; time: string | null; location: string | null; description: string | null; color: string | null }>
  >([]);
  const [addMode, setAddMode] = useState(false);
  const [clock, setClock] = useState('');
  const [emailNotifyDialog, setEmailNotifyDialog] = useState<{ measurement: any; newStatus: string } | null>(null);
  const [emailSelected, setEmailSelected] = useState<string[]>(['2002lavoro@gmail.com']);
  const [emailCustom, setEmailCustom] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({ type: 'consegna', title: '', time: '', location: '', description: '' });
  const [isDark, setIsDark] = useState(false);
  const [todayMapOpen, setTodayMapOpen] = useState(false);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'cookie' | null>(null);
  const [sendingWA, setSendingWA] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<typeof calendarAppointments[0] | null>(null);
  const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);
  const [apptSearch, setApptSearch] = useState('');
  const [giroDate, setGiroDate] = useState<Date>(() => new Date());

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [{ data: mData }, { data: pData }, { data: nData }, { data: pfData }, { data: aData }] = await Promise.all([
        supabase.from('measurements').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('news').select('*').order('created_at', { ascending: false }),
        supabase.from('portfolio_images').select('*').order('sort_order', { ascending: true }),
        supabase.from('appointments').select('*').eq('user_id', user.id).order('date', { ascending: true }),
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

  useEffect(() => {
    if (profile !== null) {
      const dark = !!profile.dark_mode;
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    }
  }, [profile?.dark_mode]);

  const toggleDarkMode = async () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    setProfile((prev: any) => prev ? { ...prev, dark_mode: newDark } : prev);
    if (user) await supabase.from('profiles').update({ dark_mode: newDark }).eq('user_id', user.id);
  };

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

  const consegneSettimana = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return calendarAppointments.filter(a => {
      const d = new Date(a.date);
      return a.type === 'consegna' && d >= startOfWeek && d <= endOfWeek;
    }).length;
  }, [calendarAppointments]);

  const fatturatoMese = useMemo(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return measurements
      .filter(m => ['ordered', 'in_production', 'delivering', 'completed'].includes(m.status) && new Date(m.created_at) >= firstOfMonth)
      .reduce((sum, m) => sum + (Number(m.estimated_price) || 0), 0);
  }, [measurements]);

  const upcoming = useMemo(() => {
    const todayStr = formatDateKey(new Date());
    return calendarAppointments
      .filter(a => a.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
      .slice(0, 7);
  }, [calendarAppointments]);

  const todayAllAppointments = useMemo(() => {
    const dateStr = formatDateKey(giroDate);
    return calendarAppointments
      .filter(a => a.date === dateStr)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [calendarAppointments, giroDate]);

  const todayMapAppointments = useMemo(() => {
    const dateStr = formatDateKey(giroDate);
    return calendarAppointments
      .filter(a => a.date === dateStr && !!a.location)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      .map(a => ({ id: a.id, title: a.title, time: a.time, location: a.location!, color: a.color }));
  }, [calendarAppointments, giroDate]);

  const weeklyStats = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const weeksAgo = 11 - i;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - weeksAgo * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const inWeek = measurements.filter(m => { const d = new Date(m.created_at); return d >= weekStart && d <= weekEnd; });
      return {
        name: `S${i + 1}`,
        Bozza: inWeek.filter(m => m.status === 'bozza').length,
        Preventivo: inWeek.filter(m => ['ricevuto', 'submitted', 'quoted', 'quote_accepted', 'quote_modifications'].includes(m.status)).length,
        Ordinato: inWeek.filter(m => ['ordered', 'in_production', 'delivering'].includes(m.status)).length,
        Completato: inWeek.filter(m => m.status === 'completed').length,
      };
    });
  }, [measurements]);

  const handleQuoteResponse = async (measurementId: string, accept: boolean) => {
    const newStatus = accept ? 'ordered' : 'quote_modifications';
    const updates: any = { status: newStatus };
    if (!accept && modificationNotes) { updates.modification_notes = modificationNotes; updates.has_modification = true; }
    const { error } = await supabase.from('measurements').update(updates).eq('id', measurementId);
    if (error) { toast.error(error.message); return; }
    const measurement = measurements.find(m => m.id === measurementId);
    setMeasurements(prev => prev.map(m => m.id === measurementId ? { ...m, ...updates } : m));
    setQuoteResponseDialog(null); setModificationNotes('');
    toast.success(accept ? 'Ordine confermato! Ti contatteremo per procedere.' : 'Richiesta di modifiche inviata.');
    if (accept && measurement) {
      setEmailSelected(['2002lavoro@gmail.com']); setEmailCustom('');
      setEmailNotifyDialog({ measurement: { ...measurement, ...updates }, newStatus: 'ordered' });
    }
    if (user && measurement) {
      const label = accept ? 'Ordine confermato' : 'Modifiche richieste';
      createNotification({
        userId: user.id, type: 'status',
        title: `🔄 ${label}: ${measurement.client_name}`,
        body: `${productLabels[measurement.product_type] || measurement.product_type}${accept ? '' : modificationNotes ? ` — ${modificationNotes}` : ''}`,
        whatsapp: true,
        whatsappMessage: `🔄 *${label}*\nCliente: ${measurement.client_name}\nProdotto: ${productLabels[measurement.product_type] || measurement.product_type}${!accept && modificationNotes ? `\nNote: ${modificationNotes}` : ''}`,
      });
    }
  };

  const handleConfirmOrder = async (m: any) => {
    const { error } = await supabase.from('measurements').update({ status: 'ordered' }).eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    setMeasurements(prev => prev.map(x => x.id === m.id ? { ...x, status: 'ordered' } : x));
    toast.success('Ordine confermato!');
    setEmailSelected(['2002lavoro@gmail.com']); setEmailCustom('');
    setEmailNotifyDialog({ measurement: m, newStatus: 'ordered' });
  };

  const handleStatusAdvanceWithEmail = async (m: any, newStatus: string) => {
    const { error } = await supabase.from('measurements').update({ status: newStatus }).eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    setMeasurements(prev => prev.map(x => x.id === m.id ? { ...x, status: newStatus } : x));
    setEmailSelected(['2002lavoro@gmail.com']); setEmailCustom('');
    setEmailNotifyDialog({ measurement: m, newStatus });
  };

  const sendEmailNotifications = async () => {
    if (emailSelected.length === 0 && !emailCustom.trim()) return;
    setSendingEmails(true);
    const allEmails = [...emailSelected, ...(emailCustom.trim() ? [emailCustom.trim()] : [])];
    const m = emailNotifyDialog?.measurement;
    for (const email of allEmails) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: { toEmail: email, toName: '', newStatus: emailNotifyDialog?.newStatus, productType: m?.product_type, clientName: m?.client_name, estimatedPrice: m?.estimated_price, estimatedDelivery: m?.estimated_delivery_date, notes: m?.notes },
        });
      } catch (e) { console.log('Email failed:', e); }
    }
    setSendingEmails(false); setEmailNotifyDialog(null);
    toast.success(`Notifica inviata a ${allEmails.length} destinatario${allEmails.length > 1 ? 'i' : ''}`);
  };

  const getAppointmentsForDay = (date: Date) => {
    const key = formatDateKey(date);
    return calendarAppointments.filter(a => a.date === key);
  };

  const openAppointmentDialog = (date: Date) => {
    setSelectedDay(date);
    setAppointmentForm({ type: 'consegna', title: '', time: '', location: '', description: '' });
    setAppointmentDialogOpen(true);
  };

  const handleSaveAppointment = async () => {
    if (!selectedDay || !appointmentForm.title.trim() || !user) return;
    const typeConfig = APPOINTMENT_TYPES[appointmentForm.type];
    const newAppointment = {
      user_id: user.id, date: formatDateKey(selectedDay), type: appointmentForm.type,
      title: appointmentForm.title.trim(), time: appointmentForm.time || null,
      location: appointmentForm.location.trim() || null, description: appointmentForm.description.trim() || null, color: typeConfig.color,
    };
    const { data, error } = await supabase.from('appointments').insert(newAppointment).select().single();
    if (error) { toast.error('Errore nel salvataggio dell\'appuntamento'); return; }
    setCalendarAppointments(prev => [...prev, data]);
    setAppointmentDialogOpen(false); setSelectedDay(null);
    setAppointmentForm({ type: 'consegna', title: '', time: '', location: '', description: '' });
    toast.success('Appuntamento salvato');
    createNotification({
      userId: user.id, type: 'appointment',
      title: `📅 Nuovo appuntamento: ${newAppointment.title}`,
      body: `${newAppointment.date}${newAppointment.time ? ' alle ' + newAppointment.time : ''}${newAppointment.location ? ' — ' + newAppointment.location : ''}`,
      whatsapp: true,
      whatsappMessage: `📅 *Nuovo appuntamento salvato*\n*${newAppointment.title}*\nData: ${newAppointment.date}${newAppointment.time ? '\nOra: ' + newAppointment.time : ''}${newAppointment.location ? '\nLuogo: ' + newAppointment.location : ''}`,
    });
  };

  const handleDeleteAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) { toast.error('Errore nella cancellazione'); return; }
    setCalendarAppointments(prev => prev.filter(a => a.id !== id));
    toast.success('Appuntamento eliminato');
  };

  const handleUpdateAppointment = async () => {
    if (!editingAppointment) return;
    const typeConfig = APPOINTMENT_TYPES[editingAppointment.type];
    const updates = {
      type: editingAppointment.type,
      title: editingAppointment.title.trim(),
      time: editingAppointment.time || null,
      location: editingAppointment.location?.trim() || null,
      description: editingAppointment.description?.trim() || null,
      color: typeConfig.color,
    };
    const { error } = await supabase.from('appointments').update(updates).eq('id', editingAppointment.id);
    if (error) { toast.error('Errore nella modifica'); return; }
    setCalendarAppointments(prev => prev.map(a => a.id === editingAppointment.id ? { ...a, ...updates } : a));
    setEditingAppointment(null);
    toast.success('Appuntamento modificato');
  };

  const sendWhatsAppGiro = async (appointments: typeof todayAllAppointments, dateLabel?: string) => {
    if (appointments.length === 0) { toast.error('Nessun appuntamento da inviare'); return; }
    setSendingWA(true);
    const label = dateLabel || new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const lines = appointments.map((a, i) => {
      const type = APPOINTMENT_TYPES[a.type]?.label || a.type;
      const time = a.time ? `⏰ ${a.time}` : '';
      const loc = a.location ? `📍 ${a.location}` : '';
      const desc = a.description ? `📝 ${a.description}` : '';
      return [`${i + 1}. *${a.title}* — ${type}`, time, loc, desc].filter(Boolean).join('\n   ');
    });
    const message = `📅 *Giro del ${label}*\n\n${lines.join('\n\n')}\n\n_Totale: ${appointments.length} appuntament${appointments.length === 1 ? 'o' : 'i'}_`;
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', { body: { message } });
      if (error || !data?.success) throw new Error(data?.error || 'Errore');
      if (data?.skipped) toast.info('WhatsApp non configurato — messaggio simulato correttamente');
      else toast.success('Riepilogo inviato su WhatsApp!');
    } catch (err: any) {
      toast.error(err.message || 'Errore invio WhatsApp');
    } finally {
      setSendingWA(false);
    }
  };

  const searchedAppointments = useMemo(() => {
    const q = apptSearch.trim().toLowerCase();
    if (!q) return [];
    return calendarAppointments
      .filter(a =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.location || '').toLowerCase().includes(q) ||
        (a.description || '').toLowerCase().includes(q)
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 15);
  }, [calendarAppointments, apptSearch]);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - startWeekday + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return new Date(year, month, dayNumber);
  });

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const todayLabel = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const isGiroToday = formatDateKey(giroDate) === formatDateKey(new Date());
  const giroLabelShort = isGiroToday
    ? 'Giro di oggi'
    : `Giro del ${giroDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`;
  const giroLabelFull = isGiroToday
    ? `Giro di oggi — ${giroDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`
    : `Giro del ${giroDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`;
  const giroDateStr = giroDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const navigateGiro = (delta: number) => {
    setGiroDate(d => { const n = new Date(d); n.setDate(n.getDate() + delta); return n; });
    setHoveredApptId(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        profile={profile}
        userEmail={user?.email || ''}
        isAdmin={isAdmin}
        darkMode={isDark}
        onToggleDarkMode={toggleDarkMode}
        onSignOut={signOut}
        onNavigate={navigate}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 border-b border-border bg-card px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-bold font-heading text-foreground leading-tight truncate">
              {(() => {
                const now = new Date();
                const totalMins = now.getHours() * 60 + now.getMinutes();
                const name = profile?.full_name?.split(' ')[0] || '';
                const greeting = totalMins < 720 ? 'Buongiorno' : totalMins < 870 ? 'Buon pomeriggio' : 'Buonasera';
                return name ? `${greeting}, ${name}` : greeting;
              })()}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-sm tabular-nums text-foreground font-semibold tracking-wider hidden sm:block">{clock}</span>
            <NotificationBell />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={Package} label="Ordini attivi" value={String(stats.ordered)} />
              <KpiCard icon={Truck} label="Consegne settimana" value={String(consegneSettimana)} />
              <KpiCard icon={FileText} label="Preventivi in attesa" value={String(stats.quoted)} />
              <KpiCard icon={TrendingUp} label="Fatturato mese" value={`€ ${fatturatoMese.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`} />
            </div>

            {/* Main grid: content left + sidebar right */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* LEFT col */}
              <div className="xl:col-span-2 flex flex-col gap-6">

                {/* Ordini per stato chart */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground">Ordini per stato</h3>
                      <span className="text-xs text-muted-foreground">Ultime 12 settimane · ordini cumulativi</span>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={weeklyStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          {[['gradBozza','#94a3b8'],['gradPrev','#f59e0b'],['gradOrd','#3b82f6'],['gradComp','#10b981']].map(([id, color]) => (
                            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.55} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        <Area type="monotone" dataKey="Bozza" stroke="#94a3b8" fill="url(#gradBozza)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="Preventivo" stroke="#f59e0b" fill="url(#gradPrev)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="Ordinato" stroke="#3b82f6" fill="url(#gradOrd)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="Completato" stroke="#10b981" fill="url(#gradComp)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {[['Bozza','#94a3b8'],['Preventivo','#f59e0b'],['Ordinato','#3b82f6'],['Completato','#10b981']].map(([label,color]) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* CTA */}
                <Card className="gradient-primary border-0">
                  <CardContent className="flex flex-col items-center gap-4 py-5 sm:flex-row">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold font-heading text-primary-foreground">Inserisci una nuova misurazione</h2>
                      <p className="mt-0.5 text-sm text-primary-foreground/70">Compila il form guidato per inviare le misure.</p>
                    </div>
                    <Link to="/nuova-misurazione">
                      <Button size="lg" className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shrink-0">
                        <Plus className="h-5 w-5" /> Inizia ora
                      </Button>
                    </Link>
                  </CardContent>
                </Card>


                {/* News */}
                <Card className="flex-1">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <Newspaper className="h-4 w-4 text-accent" />
                      <h3 className="text-sm font-heading font-semibold text-foreground">Novità e Promozioni</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {newsItems.slice(0, 6).map(n => (
                        <div key={n.id} onClick={() => setSelectedNews(n)}
                          className="rounded-lg border border-border p-3 hover:shadow-card-hover transition-all cursor-pointer">
                          {n.image_url && (
                            <img src={n.image_url} alt={n.title} className="w-full h-20 object-cover rounded-md mb-2"
                              style={{ objectPosition: n.image_position || '50% 50%' }} />
                          )}
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
                        <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Nessuna novità al momento.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* RIGHT col */}
              <div className="space-y-4">

                {/* Prossime misurazioni */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground">Prossime misurazioni</h3>
                      <span className="text-xs text-accent font-medium">{upcoming.length} appuntamenti</span>
                    </div>
                    <div>
                      {upcoming.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">Nessun appuntamento programmato.</p>
                      ) : upcoming.map(appt => {
                        const d = new Date(appt.date + 'T00:00:00');
                        return (
                          <div key={appt.id} className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
                            <div className="text-center shrink-0 w-8 pt-0.5">
                              <p className="text-sm font-bold text-foreground leading-none">{d.getDate()}</p>
                              <p className="text-[9px] text-muted-foreground uppercase mt-0.5">{d.toLocaleDateString('it-IT', { month: 'short' })}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: appt.color || '#94a3b8' }} />
                                <p className="text-xs font-semibold text-foreground truncate">{appt.title}</p>
                              </div>
                              {appt.time && <p className="text-[10px] text-muted-foreground mt-0.5">🕐 {appt.time}</p>}
                              {appt.location && <p className="text-[10px] text-muted-foreground truncate">📍 {appt.location}</p>}
                              {appt.description && <p className="text-[10px] text-muted-foreground/60 truncate">{appt.description}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Giro di oggi / altro giorno */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                      <MapPin className="h-4 w-4 text-accent shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground">{giroLabelShort}</h3>
                      <span className="text-[10px] text-muted-foreground">{todayAllAppointments.length} tappe</span>
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => navigateGiro(-1)} className="rounded p-1 hover:bg-muted transition-colors" title="Giorno precedente">
                          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {!isGiroToday && (
                          <button onClick={() => { setGiroDate(new Date()); setHoveredApptId(null); }} className="text-[10px] text-accent hover:underline px-0.5">
                            Oggi
                          </button>
                        )}
                        <button onClick={() => navigateGiro(1)} className="rounded p-1 hover:bg-muted transition-colors" title="Giorno successivo">
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {todayAllAppointments.length > 0 && (
                          <>
                            <button
                              onClick={() => sendWhatsAppGiro(todayAllAppointments, giroDateStr)}
                              disabled={sendingWA}
                              className="flex items-center gap-1 text-[10px] text-green-600 hover:underline disabled:opacity-50 ml-1"
                              title="Invia riepilogo su WhatsApp"
                            >
                              <Smartphone className="h-3 w-3" /> {sendingWA ? '…' : 'WA'}
                            </button>
                            <button onClick={() => setTodayMapOpen(true)} className="flex items-center gap-1 text-[10px] text-accent hover:underline">
                              <Maximize2 className="h-3 w-3" /> Mappa
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {todayAllAppointments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4 italic">Nessun appuntamento per oggi.</p>
                    ) : (
                      <div className="space-y-2">
                        {todayAllAppointments.slice(0, 4).map(appt => (
                          <div key={appt.id} className="flex items-start gap-2.5 rounded-lg border border-border/60 p-2.5">
                            <span className="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: appt.color || '#94a3b8' }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{appt.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {APPOINTMENT_TYPES[appt.type]?.label}{appt.time ? ` · ${appt.time}` : ''}
                              </p>
                              {appt.location && <p className="text-[10px] text-muted-foreground truncate">📍 {appt.location}</p>}
                            </div>
                            <button onClick={() => setEditingAppointment(appt)} className="text-muted-foreground hover:text-accent shrink-0 mt-0.5">
                              <Edit3 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {todayAllAppointments.length > 4 && (
                          <button onClick={() => setTodayMapOpen(true)} className="w-full text-[10px] text-accent hover:underline py-1">
                            + altri {todayAllAppointments.length - 4} appuntamenti
                          </button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Calendario */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays className="h-4 w-4 text-accent" />
                      <h3 className="text-sm font-heading font-semibold text-foreground">Calendario</h3>
                      <div className="ml-auto relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <input
                          value={apptSearch}
                          onChange={e => setApptSearch(e.target.value)}
                          placeholder="Cerca…"
                          className="pl-6 pr-2 py-1 text-[11px] rounded-md border border-border bg-background text-foreground w-28 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    </div>

                    {/* Risultati ricerca */}
                    {apptSearch.trim() && (
                      <div className="mb-3 rounded-lg border border-border bg-muted/30 max-h-48 overflow-y-auto">
                        {searchedAppointments.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground p-3 text-center">Nessun risultato.</p>
                        ) : searchedAppointments.map(appt => {
                          const d = new Date(appt.date + 'T00:00:00');
                          return (
                            <button
                              key={appt.id}
                              type="button"
                              onClick={() => {
                                setCalendarDate(new Date(appt.date + 'T00:00:00'));
                                setSelectedDay(new Date(appt.date + 'T00:00:00'));
                                setApptSearch('');
                              }}
                              className="w-full flex items-start gap-2 p-2 hover:bg-muted transition-colors text-left border-b border-border/50 last:border-0"
                            >
                              <span className="mt-0.5 h-2 w-2 rounded-full shrink-0" style={{ background: appt.color ?? '#94a3b8' }} />
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-foreground truncate">{appt.title}</p>
                                <p className="text-[9px] text-muted-foreground">
                                  {d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  {appt.time ? ` · ${appt.time}` : ''}
                                </p>
                                {appt.location && <p className="text-[9px] text-muted-foreground truncate">📍 {appt.location}</p>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))} className="rounded-md p-1 hover:bg-muted transition-colors">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <p className="text-xs font-semibold text-foreground">{monthNames[month]} {year}</p>
                      <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="rounded-md p-1 hover:bg-muted transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-muted-foreground mb-1.5">
                        {['L','M','M','G','V','S','D'].map((d,i) => <div key={i}>{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {calendarCells.map((date, i) => {
                          if (!date) return <div key={i} className="aspect-square" />;
                          const dayAppts = getAppointmentsForDay(date);
                          const firstColor = dayAppts[0]?.color;
                          const isSelected = selectedDay && formatDateKey(selectedDay) === formatDateKey(date);
                          const isToday = formatDateKey(date) === formatDateKey(new Date());
                          return (
                            <button key={i} type="button"
                              onClick={() => {
                                if (addMode) { setAddMode(false); openAppointmentDialog(date); }
                                else setSelectedDay(prev => prev && formatDateKey(prev) === formatDateKey(date) ? null : date);
                              }}
                              className={`aspect-square rounded text-[11px] font-medium flex flex-col items-center justify-center transition-colors relative ${addMode ? 'cursor-crosshair' : ''} ${isSelected ? 'bg-accent/20 text-accent font-bold' : isToday ? 'border border-accent/50 text-accent font-semibold' : 'hover:bg-accent/10'}`}
                              style={firstColor && !isSelected ? { boxShadow: `inset 0 0 0 1.5px ${firstColor}` } : undefined}
                            >
                              {date.getDate()}
                              {dayAppts.length > 0 && (
                                <div className="absolute bottom-0.5 flex gap-0.5">
                                  {dayAppts.slice(0, 3).map((a, idx) => (
                                    <span key={idx} className="h-1 w-1 rounded-full" style={{ background: a.color ?? undefined }} />
                                  ))}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-center mt-2">
                        <button type="button" onClick={() => setAddMode(p => !p)}
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${addMode ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent'}`}>
                          <Plus className="h-3 w-3" /> {addMode ? 'Seleziona giorno…' : 'Aggiungi'}
                        </button>
                      </div>
                      {selectedDay && (
                        <div className="mt-2 rounded-lg border border-border bg-background p-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-semibold text-foreground">
                              {selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            {getAppointmentsForDay(selectedDay).length > 0 && (
                              <button
                                onClick={() => sendWhatsAppGiro(
                                  getAppointmentsForDay(selectedDay),
                                  selectedDay.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                                )}
                                disabled={sendingWA}
                                className="flex items-center gap-1 text-[9px] text-green-600 hover:underline disabled:opacity-50"
                              >
                                <Smartphone className="h-2.5 w-2.5" /> WhatsApp
                              </button>
                            )}
                          </div>
                          {getAppointmentsForDay(selectedDay).length > 0 ? (
                            <div className="space-y-1.5">
                              {getAppointmentsForDay(selectedDay).map(appt => (
                                <div key={appt.id} className="rounded border border-border p-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: appt.color ?? undefined }} />
                                    <span className="text-[10px] font-semibold text-foreground flex-1">{appt.title}</span>
                                    <button onClick={() => setEditingAppointment(appt)} className="text-muted-foreground hover:text-accent">
                                      <Edit3 className="h-3 w-3" />
                                    </button>
                                    <button onClick={() => handleDeleteAppointment(appt.id)} className="text-muted-foreground hover:text-destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <p className="text-[9px] text-muted-foreground mt-0.5">
                                    {APPOINTMENT_TYPES[appt.type]?.label}{appt.time ? ` · ${appt.time}` : ''}
                                  </p>
                                  {appt.location && <p className="text-[9px] text-muted-foreground">{appt.location}</p>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground">Nessun appuntamento.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Stats mini row */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              <StatCard icon={FileText} label="Totale" value={stats.total} />
              <StatCard icon={Edit3} label="Bozze" value={stats.drafts} />
              <StatCard icon={Send} label="Preventivi" value={stats.quoted} />
              <StatCard icon={Package} label="Ordini" value={stats.ordered} />
              <StatCard icon={CheckCircle} label="Completate" value={stats.completed} />
            </div>

            {/* Measurements list */}
            <div>
              <h2 className="mb-4 text-lg font-bold font-heading text-foreground">Le tue misurazioni</h2>
              <div className="mb-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Cerca per cliente o indirizzo..." className="pl-10" value={searchText} onChange={e => setSearchText(e.target.value)} />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[160px]">
                      <Filter className="h-3.5 w-3.5 mr-1" /><SelectValue />
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
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
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
                              <Badge variant={statusLabels[m.status]?.variant || 'default'}>{statusLabels[m.status]?.label || m.status}</Badge>
                              {isGrouped && <Badge variant="outline" className="text-[10px] gap-1">📦 {itemIndex}/{totalItems}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{productLabels[m.product_type] || m.product_type} · {m.width_mm}×{m.height_mm} mm</p>
                            {m.client_address && <p className="text-xs text-muted-foreground">{m.client_address}</p>}
                            {(m as any).estimated_price > 0 && (
                              <p className="text-xs font-medium text-accent mt-0.5">Prezzo stimato: €{Number((m as any).estimated_price).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                            )}
                            {photos.length > 0 && (
                              <div className="flex gap-1.5 mt-2">
                                {photos.slice(0, 4).map((url: string, i: number) => (
                                  <div key={i} className="w-10 h-10 rounded border border-border overflow-hidden cursor-pointer hover:ring-2 hover:ring-accent transition-all"
                                    onClick={(e) => { e.stopPropagation(); setSelectedPhoto(url); }}>
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                                {photos.length > 4 && (
                                  <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center text-xs text-muted-foreground">+{photos.length - 4}</div>
                                )}
                              </div>
                            )}
                            {m.status !== 'bozza' && (
                              <div className="flex items-center gap-0.5 mt-2">
                                {WORKFLOW_STEPS.slice(1).map((ws, idx) => {
                                  const currentIdx = getWorkflowIndex(m.status);
                                  const stepIdx = idx + 1;
                                  const isActive = stepIdx <= currentIdx;
                                  const isCurrent = stepIdx === currentIdx;
                                  return (
                                    <div key={ws.key} className="flex items-center gap-0.5">
                                      <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[8px] ${isCurrent ? 'bg-accent text-accent-foreground ring-2 ring-accent/30' : isActive ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`} title={ws.label}>
                                        {ws.icon}
                                      </div>
                                      {idx < WORKFLOW_STEPS.length - 2 && <div className={`w-3 h-0.5 ${isActive ? 'bg-accent/40' : 'bg-muted'}`} />}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
                            {m.status === 'quote_accepted' && (
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); handleConfirmOrder(m); }}>
                                  <Package className="h-3.5 w-3.5" /> Conferma ordine
                                </Button>
                              </div>
                            )}
                            {m.status === 'quote_modifications' && !String(m.notes || '').startsWith('Accessorio di') && (
                              <div className="flex gap-2 mt-2">
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={(e) => { e.stopPropagation(); navigate(`/misurazione/${m.id}/modifica`); }}>
                                  <Edit3 className="h-3.5 w-3.5" /> Modifica misurazione
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
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
                          <div className="text-right text-sm text-muted-foreground whitespace-nowrap shrink-0">
                            {new Date(m.created_at).toLocaleDateString('it-IT')}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Portfolio */}
            {portfolioImages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-accent" />
                  <h2 className="text-lg font-bold font-heading text-foreground">I nostri lavori</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {portfolioImages.map(img => (
                    <div key={img.id} className="group rounded-xl overflow-hidden border border-border cursor-pointer hover:shadow-card-hover transition-all" onClick={() => setSelectedPhoto(img.image_url)}>
                      <div className="aspect-square overflow-hidden">
                        <img src={img.image_url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">{img.title}</p>
                        <p className="text-[10px] text-muted-foreground">{img.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-2 -mx-6 -mb-6 bg-foreground text-background">
              <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
                {/* Brand */}
                <div>
                  <p className="text-sm font-bold tracking-wide">FAREWELL SRL</p>
                  <p className="text-[11px] opacity-40 mt-0.5">P.IVA 02484510504 · Casciana Terme Lari (PI)</p>
                  <p className="text-[11px] opacity-40">farewellsrl@pec.cgn.it</p>
                </div>
                {/* Social */}
                <div className="flex items-center gap-2">
                  <a href="https://www.facebook.com/pratellirappresentanze?locale=it_IT" target="_blank" rel="noopener noreferrer"
                    className="h-9 w-9 rounded-lg bg-white/10 hover:bg-[#1877F2] flex items-center justify-center transition-colors" title="Facebook">
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a href="https://www.instagram.com/pratellirappresentanze/?hl=it" target="_blank" rel="noopener noreferrer"
                    className="h-9 w-9 rounded-lg bg-white/10 hover:bg-[#E1306C] flex items-center justify-center transition-colors" title="Instagram">
                    <Instagram className="h-4 w-4" />
                  </a>
                  <a href="https://www.linkedin.com/company/pratellirappresentanze/posts/?feedView=all" target="_blank" rel="noopener noreferrer"
                    className="h-9 w-9 rounded-lg bg-white/10 hover:bg-[#0A66C2] flex items-center justify-center transition-colors" title="LinkedIn">
                    <Linkedin className="h-4 w-4" />
                  </a>
                </div>
              </div>
              <div className="border-t border-white/10 px-6 py-3 flex items-center justify-between flex-wrap gap-2">
                <p className="text-[11px] opacity-35">© {new Date().getFullYear()} FAREWELL SRL — Tutti i diritti riservati</p>
                <div className="flex gap-4 text-[11px] opacity-40">
                  <button onClick={() => setPolicyModal('privacy')} className="hover:opacity-100 transition-opacity">Privacy Policy</button>
                  <button onClick={() => setPolicyModal('cookie')} className="hover:opacity-100 transition-opacity">Cookie Policy</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <Dialog open={!!selectedNews} onOpenChange={open => !open && setSelectedNews(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">{selectedNews?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Badge variant="secondary">{selectedNews?.tag}</Badge>
            {selectedNews?.image_url && <img src={selectedNews.image_url} alt="" className="w-full rounded-lg" />}
            <p className="text-sm text-foreground leading-relaxed">{selectedNews?.summary}</p>
            <p className="text-xs text-muted-foreground">{selectedNews && new Date(selectedNews.created_at).toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <div className="flex gap-2">
              {selectedNews?.link && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={selectedNews.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Leggi articolo</a>
                </Button>
              )}
              {selectedNews?.social_link && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <a href={selectedNews.social_link} target="_blank" rel="noopener noreferrer"><Instagram className="h-3.5 w-3.5" /> Vedi post social</a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedPhoto} onOpenChange={open => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="font-heading">Foto</DialogTitle></DialogHeader>
          {selectedPhoto && <img src={selectedPhoto} alt="" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!quoteResponseDialog} onOpenChange={open => { if (!open) { setQuoteResponseDialog(null); setModificationNotes(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Richiedi modifiche al preventivo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Descrivi le modifiche che desideri apportare. Il team le valuterà e ti invierà un nuovo preventivo aggiornato.</p>
            <Textarea value={modificationNotes} onChange={e => setModificationNotes(e.target.value)} placeholder="Descrivi le modifiche richieste..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setQuoteResponseDialog(null); setModificationNotes(''); }}>Annulla</Button>
            <Button onClick={() => quoteResponseDialog && handleQuoteResponse(quoteResponseDialog.id, false)} disabled={!modificationNotes.trim()}>Invia richiesta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={appointmentDialogOpen} onOpenChange={(open) => { setAppointmentDialogOpen(open); if (!open) setAddMode(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Nuovo appuntamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {selectedDay?.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={appointmentForm.type} onValueChange={v => setAppointmentForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <label className="text-sm font-medium">Titolo / Cliente</label>
              <Input value={appointmentForm.title} onChange={e => setAppointmentForm(p => ({ ...p, title: e.target.value }))} placeholder="Es. Bianchi Mario" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Orario</label>
              <Input type="time" value={appointmentForm.time} onChange={e => setAppointmentForm(p => ({ ...p, time: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Indirizzo</label>
              <Input value={appointmentForm.location} onChange={e => setAppointmentForm(p => ({ ...p, location: e.target.value }))} placeholder="Es. Via Roma 12, Pisa" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrizione</label>
              <Textarea rows={2} value={appointmentForm.description} onChange={e => setAppointmentForm(p => ({ ...p, description: e.target.value }))} placeholder="Note aggiuntive..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppointmentDialogOpen(false)}>Annulla</Button>
            <Button onClick={handleSaveAppointment} disabled={!appointmentForm.title.trim()}>Salva appuntamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog modifica appuntamento */}
      <Dialog open={!!editingAppointment} onOpenChange={o => !o && setEditingAppointment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Modifica appuntamento</DialogTitle></DialogHeader>
          {editingAppointment && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {new Date(editingAppointment.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={editingAppointment.type} onValueChange={v => setEditingAppointment(prev => prev ? { ...prev, type: v } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <label className="text-sm font-medium">Titolo / Cliente</label>
                <Input value={editingAppointment.title} onChange={e => setEditingAppointment(prev => prev ? { ...prev, title: e.target.value } : null)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Orario</label>
                <Input type="time" value={editingAppointment.time || ''} onChange={e => setEditingAppointment(prev => prev ? { ...prev, time: e.target.value } : null)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Indirizzo</label>
                <Input value={editingAppointment.location || ''} onChange={e => setEditingAppointment(prev => prev ? { ...prev, location: e.target.value } : null)} placeholder="Es. Via Roma 12, Pisa" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrizione</label>
                <Textarea rows={2} value={editingAppointment.description || ''} onChange={e => setEditingAppointment(prev => prev ? { ...prev, description: e.target.value } : null)} placeholder="Note aggiuntive..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAppointment(null)}>Annulla</Button>
            <Button onClick={handleUpdateAppointment} disabled={!editingAppointment?.title?.trim()}>Salva modifiche</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog mappa giro di oggi */}
      <Dialog open={todayMapOpen} onOpenChange={o => { setTodayMapOpen(o); if (!o) setHoveredApptId(null); }}>
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader>
            <div className="flex items-center gap-3 pr-8">
              <DialogTitle className="font-heading flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="h-4 w-4 text-accent shrink-0" />
                <span className="truncate">{giroLabelFull}</span>
              </DialogTitle>
              <button
                onClick={() => sendWhatsAppGiro(todayAllAppointments, giroDateStr)}
                disabled={sendingWA}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors shrink-0"
              >
                <Smartphone className="h-3.5 w-3.5" /> {sendingWA ? 'Invio…' : 'WhatsApp'}
              </button>
            </div>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {todayAllAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun appuntamento.</p>
              ) : todayAllAppointments.map(appt => (
                <div
                  key={appt.id}
                  className={`flex items-start gap-2.5 rounded-lg border p-3 cursor-default transition-colors ${hoveredApptId === appt.id ? 'border-accent/60 bg-accent/5' : 'border-border'}`}
                  onMouseEnter={() => setHoveredApptId(appt.id)}
                  onMouseLeave={() => setHoveredApptId(null)}
                >
                  <span className="mt-0.5 h-2.5 w-2.5 rounded-full shrink-0" style={{ background: appt.color || '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{appt.title}</p>
                    <p className="text-xs text-muted-foreground">{APPOINTMENT_TYPES[appt.type]?.label}{appt.time ? ` · ${appt.time}` : ''}</p>
                    {appt.location && <p className="text-xs text-muted-foreground">📍 {appt.location}</p>}
                    {appt.description && <p className="text-xs text-muted-foreground/70">{appt.description}</p>}
                  </div>
                  <button onClick={() => setEditingAppointment(appt)} className="text-muted-foreground hover:text-accent shrink-0 mt-0.5">
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="sm:col-span-2" style={{ height: '480px' }}>
              {todayMapOpen && <AppointmentMap appointments={todayMapAppointments} hoveredId={hoveredApptId} />}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!emailNotifyDialog} onOpenChange={open => { if (!open) setEmailNotifyDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="font-heading">Invia notifica via email</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Seleziona o aggiungi i destinatari a cui inviare la conferma di stato.</p>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">CONTATTI RAPIDI</p>
              {[{ label: 'Admin Pratelli', email: '2002lavoro@gmail.com' }, { label: 'Leo Pratelli', email: 'leo.prate02@gmail.com' }].map(({ label, email }) => (
                <button key={email} type="button"
                  onClick={() => setEmailSelected(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email])}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${emailSelected.includes(email) ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted'}`}>
                  <span className="font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{email}</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">AGGIUNGI EMAIL</p>
              <div className="flex gap-2">
                <Input type="email" placeholder="altra@email.com" value={emailCustom} onChange={e => setEmailCustom(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && emailCustom.trim()) { setEmailSelected(prev => prev.includes(emailCustom.trim()) ? prev : [...prev, emailCustom.trim()]); setEmailCustom(''); } }} />
                <Button variant="outline" onClick={() => { if (emailCustom.trim()) { setEmailSelected(prev => prev.includes(emailCustom.trim()) ? prev : [...prev, emailCustom.trim()]); setEmailCustom(''); } }}>Aggiungi</Button>
              </div>
              {emailSelected.filter(e => !['2002lavoro@gmail.com','leo.prate02@gmail.com'].includes(e)).map(email => (
                <div key={email} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{email}</span>
                  <button type="button" onClick={() => setEmailSelected(prev => prev.filter(e => e !== email))} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEmailNotifyDialog(null)}>Salta</Button>
            <Button onClick={sendEmailNotifications} disabled={sendingEmails || emailSelected.length === 0} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {sendingEmails ? 'Invio...' : `Invia a ${emailSelected.length} destinatar${emailSelected.length === 1 ? 'io' : 'i'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy / Cookie Policy modals */}
      <Dialog open={policyModal === 'privacy'} onOpenChange={o => !o && setPolicyModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Privacy Policy</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3 max-h-96 overflow-y-auto pr-1">
            <p><strong className="text-foreground">Titolare del trattamento:</strong> FAREWELL SRL — P. IVA 02484510504, Via Livornese Ovest 22/A, 56035 Casciana Terme Lari (PI) — PEC: farewellsrl@pec.cgn.it</p>
            <p><strong className="text-foreground">Finalità del trattamento:</strong> I dati personali (nome, email, telefono, indirizzo) sono trattati per la gestione delle misurazioni, la generazione di preventivi e le comunicazioni operative tra l'azienda e i rivenditori autorizzati.</p>
            <p><strong className="text-foreground">Base giuridica:</strong> Esecuzione di un contratto o di misure precontrattuali (art. 6.1.b GDPR) e legittimo interesse aziendale.</p>
            <p><strong className="text-foreground">Conservazione:</strong> I dati sono conservati per il tempo necessario all'erogazione del servizio e non oltre 10 anni dalla cessazione del rapporto contrattuale, nel rispetto degli obblighi di legge.</p>
            <p><strong className="text-foreground">Diritti dell'interessato:</strong> Ai sensi degli artt. 15-22 GDPR hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione al trattamento. Puoi esercitare tali diritti scrivendo a farewellsrl@pec.cgn.it.</p>
            <p><strong className="text-foreground">Comunicazione a terzi:</strong> I dati non sono ceduti a terzi, salvo obbligo di legge o fornitori tecnici necessari alla gestione del servizio (es. Supabase per la gestione del database, in conformità al GDPR).</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={policyModal === 'cookie'} onOpenChange={o => !o && setPolicyModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">Cookie Policy</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3 max-h-96 overflow-y-auto pr-1">
            <p><strong className="text-foreground">Tipologie di cookie utilizzati:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Cookie tecnici necessari:</strong> usati per mantenere attiva la sessione di autenticazione (Supabase session token). Non richiedono consenso.</li>
              <li><strong className="text-foreground">Cookie di preferenza:</strong> memorizzano le impostazioni dell'utente come la modalità scura (dark mode). Non profilano l'utente.</li>
            </ul>
            <p><strong className="text-foreground">Cookie di profilazione o di terze parti:</strong> questa piattaforma non utilizza cookie di profilazione né cookie di terze parti per finalità pubblicitarie.</p>
            <p><strong className="text-foreground">Gestione dei cookie:</strong> Puoi gestire o disabilitare i cookie tramite le impostazioni del tuo browser. La disabilitazione dei cookie tecnici potrebbe compromettere il corretto funzionamento del portale.</p>
            <p><strong className="text-foreground">Contatti:</strong> Per qualsiasi informazione relativa ai cookie scrivi a farewellsrl@pec.cgn.it.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-5 px-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <div className="rounded-lg bg-accent/10 p-1.5">
            <Icon className="h-4 w-4 text-accent" />
          </div>
        </div>
        <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="rounded-lg bg-muted p-2"><Icon className="h-5 w-5 text-muted-foreground" /></div>
        <div>
          <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
