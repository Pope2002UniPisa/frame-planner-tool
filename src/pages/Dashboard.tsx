import { useEffect, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
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
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Trash2, TrendingUp, MapPin, Facebook, Linkedin, Navigation, Menu,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import {
  useMeasurements, useProfile, useNewsItems, usePortfolioImages, useAppointments,
  QUERY_KEYS,
  type Measurement, type Appointment, type Profile, type NewsItem, type PortfolioItem,
} from '@/hooks/useDashboardQueries';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { productLabels, statusLabels, WORKFLOW_STEPS, getWorkflowIndex, productIcons, APPOINTMENT_TYPES, MONTH_NAMES, ADMIN_EMAIL } from '@/lib/constants';
import { NotificationBell } from '@/components/NotificationBell';
import { createNotification } from '@/lib/notifications';
import { recordStatusChange } from '@/lib/statusHistory';
import { AppSidebar } from '@/components/AppSidebar';
import { AppointmentMap } from '@/components/AppointmentMap';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';


function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildGoogleMapsUrl(appointments: Array<{ location: string | null; time: string | null }>): string {
  const withLoc = appointments.filter(a => a.location);
  if (withLoc.length === 0) return 'https://maps.google.com';
  // No origin — Google Maps chiede la posizione di partenza all'utente
  const dest = encodeURIComponent(withLoc[withLoc.length - 1].location!);
  const waypoints = withLoc.slice(0, -1).map(a => encodeURIComponent(a.location!)).join('|');
  let url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  if (waypoints) url += `&waypoints=${waypoints}`;
  return url;
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();

  // ── Dati remoti via React Query (no useState manuale) ──────────────────────
  const queryClient = useQueryClient();
  const { data: measurements = [], isLoading: loadingMeasurements } = useMeasurements(user?.id);
  const { data: profile }                                            = useProfile(user?.id);
  const { data: newsItems = [] }                                     = useNewsItems();
  const { data: portfolioImages = [] }                               = usePortfolioImages();
  const loadingData = loadingMeasurements;
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProduct, setFilterProduct] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedProductTypes, setExpandedProductTypes] = useState<Set<string>>(new Set());
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [quoteResponseDialog, setQuoteResponseDialog] = useState<Measurement | null>(null);
  const [modificationNotes, setModificationNotes] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const { data: calendarAppointments = [] } = useAppointments(user?.id);
  const [addMode, setAddMode] = useState(false);
  const [clock, setClock] = useState('');
  const [emailNotifyDialog, setEmailNotifyDialog] = useState<{ measurement: Measurement; newStatus: string } | null>(null);
  const [emailSelected, setEmailSelected] = useState<string[]>([]);
  const [emailCustom, setEmailCustom] = useState('');
  const [sendingEmails, setSendingEmails] = useState(false);

  const buildDefaultEmails = () => {
    const emails = [ADMIN_EMAIL];
    const profileEmail = profile?.email;
    if (profileEmail && profileEmail !== ADMIN_EMAIL) emails.push(profileEmail);
    return emails;
  };
  const [appointmentForm, setAppointmentForm] = useState({ type: 'consegna', title: '', time: '', location: '', description: '' });
  // Dark mode è il tema permanente del brand — sempre attivo
  const [isDark] = useState(true);
  const [todayMapOpen, setTodayMapOpen] = useState(false);
  const [mapMounted, setMapMounted] = useState(false);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'cookie' | null>(null);
  const [sendingWA, setSendingWA] = useState(false);
  // Dialog selezione destinatari WhatsApp
  const [waDialog, setWaDialog] = useState<{ appointments: typeof todayAllAppointments; dateLabel?: string } | null>(null);
  const [waNumbers, setWaNumbers] = useState<string[]>([]);
  const [waCustomInput, setWaCustomInput] = useState('');
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [hoveredApptId, setHoveredApptId] = useState<string | null>(null);
  const [apptSearch, setApptSearch] = useState('');
  const [giroDate, setGiroDate] = useState<Date>(() => new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);


  useEffect(() => {
    // Forza dark class sempre — brand Measure Master
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  // Monta la mappa solo dopo che l'animazione del dialog è completata (evita container 0px su iOS)
  useEffect(() => {
    if (todayMapOpen) {
      const t = setTimeout(() => setMapMounted(true), 350);
      return () => clearTimeout(t);
    } else {
      setMapMounted(false);
    }
  }, [todayMapOpen]);

  // No-op — dark mode è il tema permanente del brand
  const toggleDarkMode = () => {};

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

  const toggleProductType = (type: string) =>
    setExpandedProductTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });

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

  const groupedMeasurements = useMemo(() => {
    const order = ['finestra', 'porta', 'porta_finestra', 'basculante', 'persiana', 'zanzariera'];
    const groups: Record<string, Measurement[]> = {};
    filteredMeasurements.forEach(m => {
      const type = m.product_type || 'altro';
      if (!groups[type]) groups[type] = [];
      groups[type].push(m);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [filteredMeasurements]);

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
    const updates: Partial<Measurement> = { status: newStatus };
    if (!accept && modificationNotes) {
      updates.modification_notes = modificationNotes;
      updates.has_modification = true;
    }
    const { error } = await supabase.from('measurements').update(updates).eq('id', measurementId);
    if (error) { toast.error(error.message); return; }
    const measurement = measurements.find(m => m.id === measurementId);
    await recordStatusChange(measurementId, measurement?.status ?? null, newStatus, !accept && modificationNotes ? modificationNotes : undefined);
    if (user) {
      queryClient.setQueryData<Measurement[]>(QUERY_KEYS.measurements(user.id), (old = []) =>
        old.map(m => m.id === measurementId ? { ...m, ...updates } : m)
      );
    }
    setQuoteResponseDialog(null); setModificationNotes('');
    toast.success(accept ? 'Ordine confermato! Ti contatteremo per procedere.' : 'Richiesta di modifiche inviata.');
    if (accept && measurement) {
      setEmailSelected(buildDefaultEmails()); setEmailCustom('');
      setEmailNotifyDialog({ measurement: { ...measurement, ...updates }, newStatus: 'ordered' });
    }
    if (user && measurement) {
      const label = accept ? 'Ordine confermato' : 'Modifiche richieste';
      createNotification({
        userId: user.id, type: 'status',
        title: `🔄 ${label}: ${measurement.client_name}`,
        body: `${productLabels[measurement.product_type] || measurement.product_type}${accept ? '' : modificationNotes ? ` — ${modificationNotes}` : ''}`,
        metadata: { measurementId: measurement.id },
        whatsapp: true,
        whatsappMessage: `🔄 *${label}*\nCliente: ${measurement.client_name}\nProdotto: ${productLabels[measurement.product_type] || measurement.product_type}${!accept && modificationNotes ? `\nNote: ${modificationNotes}` : ''}`,
      });
    }
  };

  const handleConfirmOrder = async (m: Measurement) => {
    const { error } = await supabase.from('measurements').update({ status: 'ordered' }).eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    await recordStatusChange(m.id, m.status, 'ordered');
    if (user) {
      queryClient.setQueryData<Measurement[]>(QUERY_KEYS.measurements(user.id), (old = []) =>
        old.map(x => x.id === m.id ? { ...x, status: 'ordered' } : x)
      );
    }
    toast.success('Ordine confermato!');
    setEmailSelected(buildDefaultEmails()); setEmailCustom('');
    setEmailNotifyDialog({ measurement: m, newStatus: 'ordered' });
  };

  const handleStatusAdvanceWithEmail = async (m: Measurement, newStatus: string) => {
    const { error } = await supabase.from('measurements').update({ status: newStatus }).eq('id', m.id);
    if (error) { toast.error(error.message); return; }
    await recordStatusChange(m.id, m.status, newStatus);
    if (user) {
      queryClient.setQueryData<Measurement[]>(QUERY_KEYS.measurements(user.id), (old = []) =>
        old.map(x => x.id === m.id ? { ...x, status: newStatus } : x)
      );
    }
    setEmailSelected(buildDefaultEmails()); setEmailCustom('');
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
    toast.success(`Notifica inviata a ${allEmails.length} destinatar${allEmails.length === 1 ? 'io' : 'i'}`);
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
    if (user) {
      queryClient.setQueryData<Appointment[]>(QUERY_KEYS.appointments(user.id), (old = []) =>
        [...old, data as Appointment]
      );
    }
    setAppointmentDialogOpen(false); setSelectedDay(null);
    setAppointmentForm({ type: 'consegna', title: '', time: '', location: '', description: '' });
    toast.success('Appuntamento salvato');
    createNotification({
      userId: user.id, type: 'appointment',
      title: `📅 Nuovo appuntamento: ${newAppointment.title}`,
      body: `${newAppointment.date}${newAppointment.time ? ' alle ' + newAppointment.time : ''}${newAppointment.location ? ' — ' + newAppointment.location : ''}`,
      metadata: { appointmentDate: newAppointment.date },
      whatsapp: true,
      whatsappMessage: `📅 *Nuovo appuntamento salvato*\n*${newAppointment.title}*\nData: ${newAppointment.date}${newAppointment.time ? '\nOra: ' + newAppointment.time : ''}${newAppointment.location ? '\nLuogo: ' + newAppointment.location : ''}`,
    });
  };

  const handleDeleteAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) { toast.error('Errore nella cancellazione'); return; }
    if (user) {
      queryClient.setQueryData<Appointment[]>(QUERY_KEYS.appointments(user.id), (old = []) =>
        old.filter(a => a.id !== id)
      );
    }
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
    if (user) {
      queryClient.setQueryData<Appointment[]>(QUERY_KEYS.appointments(user.id), (old = []) =>
        old.map(a => a.id === editingAppointment.id ? { ...a, ...updates } : a)
      );
    }
    setEditingAppointment(null);
    toast.success('Appuntamento modificato');
  };

  // Apre il dialog per scegliere i numeri prima di inviare il giro
  const sendWhatsAppGiro = (appointments: typeof todayAllAppointments, dateLabel?: string) => {
    if (appointments.length === 0) { toast.error('Nessun appuntamento da inviare'); return; }
    // Pre-seleziona il numero del profilo se disponibile
    const defaults: string[] = [];
    if (profile?.phone?.trim()) defaults.push(profile.phone.trim());
    setWaNumbers(defaults);
    setWaCustomInput('');
    setWaDialog({ appointments, dateLabel });
  };

  // Invia il giro a tutti i numeri selezionati nel dialog
  const confirmSendWhatsApp = async () => {
    if (!waDialog || waNumbers.length === 0) return;
    setSendingWA(true);
    const { appointments, dateLabel } = waDialog;
    const label = dateLabel || new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const lines = appointments.map((a, i) => {
      const type = APPOINTMENT_TYPES[a.type]?.label || a.type;
      const time = a.time ? `⏰ ${a.time}` : '';
      const loc = a.location ? `📍 ${a.location}` : '';
      const desc = a.description ? `📝 ${a.description}` : '';
      return [`${i + 1}. *${a.title}* — ${type}`, time, loc, desc].filter(Boolean).join('\n   ');
    });
    const message = `📅 *Giro del ${label}*\n\n${lines.join('\n\n')}\n\n_Totale: ${appointments.length} appuntament${appointments.length === 1 ? 'o' : 'i'}_`;
    let sent = 0;
    for (const to of waNumbers) {
      try {
        const { data, error } = await supabase.functions.invoke('send-whatsapp', { body: { message, to } });
        if (error || !data?.success) { if (!data?.skipped) throw new Error(data?.error || 'Errore'); }
        if (data?.skipped) toast.info('WhatsApp non configurato — messaggio simulato');
        else sent++;
      } catch (err: any) {
        toast.error(`Errore per ${to}: ${err.message}`);
      }
    }
    if (sent > 0) toast.success(`Riepilogo inviato a ${sent} destinatar${sent === 1 ? 'io' : 'i'} WhatsApp`);
    setSendingWA(false);
    setWaDialog(null);
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
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 bg-background"
                style={{ borderBottom: '1px solid hsl(30 9% 13%)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors shrink-0"
              aria-label="Apri menu"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
            <div className="min-w-0">
              <p className="leading-tight truncate" style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 400,
                color: 'hsl(var(--foreground))',
                letterSpacing: '-0.01em',
              }}>
                {(() => {
                  const now = new Date();
                  const totalMins = now.getHours() * 60 + now.getMinutes();
                  // Fallback: full_name → company_name (primo token) → nessun nome
                  const rawName = profile?.full_name || profile?.company_name || '';
                  const name = rawName.split(' ')[0];
                  const greeting = totalMins < 720 ? 'Buongiorno' : totalMins < 870 ? 'Buon pomeriggio' : 'Buonasera';
                  return name ? `${greeting}, ${name}` : greeting;
                })()}
              </p>
              <p className="text-[11px] capitalize mt-0.5" style={{
                color: 'hsl(var(--muted-foreground))',
                letterSpacing: '0.06em',
              }}>{todayLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 400,
              letterSpacing: '0.04em',
              color: 'hsl(35 25% 65%)',
            }} className="hidden sm:block tabular-nums">{clock}</span>
            <NotificationBell />
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 space-y-6">

            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {loadingData ? (
                [1,2,3,4].map(i => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
                ))
              ) : (
                <>
                  <KpiCard icon={Package} label="Ordini attivi" value={String(stats.ordered)} />
                  <KpiCard icon={Truck} label="Consegne settimana" value={String(consegneSettimana)} />
                  <KpiCard icon={FileText} label="Preventivi in attesa" value={String(stats.quoted)} />
                  <KpiCard icon={TrendingUp} label="Fatturato mese" value={`€ ${fatturatoMese.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`} />
                </>
              )}
            </div>

            {/* Main grid: content left + sidebar right */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* LEFT col */}
              <div className="xl:col-span-2 flex flex-col gap-6">

                {/* Ordini per stato chart */}
                <Card className="shadow-surface border-0">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 18,
                        fontWeight: 400,
                        color: 'hsl(var(--foreground))',
                        letterSpacing: '-0.01em',
                      }}>Ordini per stato</h3>
                      <span style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'hsl(var(--muted-foreground))',
                      }}>Ultime 12 settimane</span>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={weeklyStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          {[['gradBozza','#a09080'],['gradPrev','#C8874A'],['gradOrd','#7A9AB5'],['gradComp','#7AAF8A']].map(([id, color]) => (
                            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.45} />
                              <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(25 10% 42%)' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 9, fill: 'hsl(25 10% 42%)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{
                          fontSize: 11, borderRadius: 10,
                          background: 'hsl(30 9% 13%)',
                          border: '1px solid hsl(30 9% 18%)',
                          color: 'hsl(35 25% 85%)',
                          boxShadow: '0 8px 24px -4px hsl(30 15% 3% / 0.6)',
                        }} />
                        <Area type="monotone" dataKey="Bozza" stroke="#a09080" fill="url(#gradBozza)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="Preventivo" stroke="#C8874A" fill="url(#gradPrev)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="Ordinato" stroke="#7A9AB5" fill="url(#gradOrd)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="Completato" stroke="#7AAF8A" fill="url(#gradComp)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                    {/* Chart legend */}
                    <div className="flex items-center gap-5 mt-3 flex-wrap">
                      {[['Bozza','#a09080'],['Preventivo','#C8874A'],['Ordinato','#7A9AB5'],['Completato','#7AAF8A']].map(([lbl,color]) => (
                        <div key={lbl} className="flex items-center gap-1.5">
                          <div className="h-1.5 w-4 rounded-full" style={{ background: color }} />
                          <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'hsl(var(--muted-foreground))' }}>{lbl}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* CTA — luxury editorial */}
                <div className="rounded-2xl overflow-hidden shadow-surface"
                     style={{ background: 'linear-gradient(135deg, hsl(30 10% 13%), hsl(30 8% 9%))' }}>
                  {/* Gold top line */}
                  <div style={{ height: 1, background: 'linear-gradient(90deg, hsl(28 55% 54% / 0.6), transparent)' }} />
                  <div className="flex flex-col sm:flex-row items-center gap-5 px-7 py-7">
                    <div className="flex-1">
                      <p style={{
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.14em',
                        textTransform: 'uppercase', color: 'hsl(28 55% 64%)',
                        marginBottom: 8,
                      }}>Nuova scheda</p>
                      <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 26, fontWeight: 400, letterSpacing: '-0.01em',
                        color: 'hsl(35 25% 91%)', lineHeight: 1.2,
                      }}>Inserisci una nuova misurazione</h2>
                      <p style={{ fontSize: 14, color: 'hsl(25 10% 55%)', marginTop: 6 }}>
                        Compila il form guidato per inviare le misure.
                      </p>
                    </div>
                    <Link to="/nuova-misurazione">
                      <Button size="lg" className="gap-2 shrink-0 font-semibold"
                              style={{ background: 'hsl(28 55% 54%)', color: '#fff', border: 'none' }}>
                        <Plus className="h-4 w-4" /> Inizia ora
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* News */}
                <Card className="flex-1 shadow-surface border-0">
                  <CardContent className="p-5 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-4">
                      <Newspaper className="h-3.5 w-3.5" style={{ color: 'hsl(28 55% 54%)' }} />
                      <h3 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 17, fontWeight: 400,
                        color: 'hsl(var(--foreground))',
                        letterSpacing: '-0.01em',
                      }}>Novità e Promozioni</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {newsItems.slice(0, 6).map(n => (
                        <div key={n.id} onClick={() => setSelectedNews(n)}
                          className="rounded-xl cursor-pointer transition-all duration-150"
                          style={{ background: 'hsl(30 8% 13%)', padding: 12 }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'hsl(30 8% 15%)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'hsl(30 8% 13%)')}>
                          {n.image_url && (
                            <img src={n.image_url} alt={n.title} className="w-full h-24 object-cover rounded-lg mb-2.5"
                              style={{ objectPosition: n.image_position || '50% 50%' }} />
                          )}
                          <div className="flex items-center gap-1.5 mb-2">
                            <span style={{
                              fontSize: 9, fontWeight: 600, letterSpacing: '0.1em',
                              textTransform: 'uppercase', color: 'hsl(28 55% 64%)',
                              background: 'hsl(28 55% 54% / 0.12)',
                              padding: '2px 6px', borderRadius: 4,
                            }}>{n.tag}</span>
                            {n.link && <ExternalLink className="h-2.5 w-2.5" style={{ color: 'hsl(25 10% 42%)' }} />}
                            {n.social_link && <Instagram className="h-2.5 w-2.5" style={{ color: 'hsl(25 10% 42%)' }} />}
                          </div>
                          <p className="text-xs font-semibold leading-tight line-clamp-2" style={{ color: 'hsl(35 25% 85%)' }}>{n.title}</p>
                          <p style={{ fontSize: 10, color: 'hsl(25 10% 42%)', marginTop: 4 }}>{new Date(n.created_at).toLocaleDateString('it-IT')}</p>
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

                {/* Giro di oggi / altro giorno */}
                <Card className="shadow-surface border-0">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-1.5 mb-3">
                      <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: 'hsl(28 55% 54%)' }} />
                      <h3 style={{
                        fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 400,
                        color: 'hsl(var(--foreground))', letterSpacing: '-0.01em',
                      }} className="truncate">{giroLabelShort}</h3>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{todayAllAppointments.length} tappe</span>
                      {/* Azioni giro: WhatsApp e Mappa */}
                      <div className="ml-auto flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => !sendingWA && todayAllAppointments.length > 0 && sendWhatsAppGiro(todayAllAppointments, giroDateStr)}
                          disabled={sendingWA || todayAllAppointments.length === 0}
                          title="Invia riepilogo su WhatsApp"
                          className={cn(
                            'rounded p-1 transition-colors',
                            todayAllAppointments.length === 0 ? 'opacity-25 cursor-not-allowed' : 'hover:bg-muted'
                          )}
                        >
                          <WhatsAppIcon className={cn('h-3.5 w-3.5', sendingWA ? 'opacity-50' : 'text-[#25D366]')} />
                        </button>
                        <button
                          onClick={() => todayAllAppointments.length > 0 && setTodayMapOpen(true)}
                          disabled={todayAllAppointments.length === 0}
                          className={cn(
                            'flex items-center gap-1 text-[10px] transition-colors',
                            todayAllAppointments.length === 0 ? 'opacity-25 cursor-not-allowed text-muted-foreground' : 'text-accent hover:underline'
                          )}
                        >
                          <Maximize2 className="h-3 w-3" /> Mappa
                        </button>
                      </div>
                    </div>
                    {todayAllAppointments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4 italic">
                        {isGiroToday ? 'Nessun appuntamento per oggi.' : 'Nessun appuntamento per questo giorno.'}
                      </p>
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
                      <p className="text-xs font-semibold text-foreground">{MONTH_NAMES[month]} {year}</p>
                      <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))} className="rounded-md p-1 hover:bg-muted transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-semibold text-muted-foreground mb-1.5">
                        {['L','M','M','G','V','S','D'].map((d,i) => <div key={i}>{d}</div>)}
                      </div>
                      <div className="calendar-grid grid grid-cols-7 gap-0.5">
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
                                else {
                                  const isSame = selectedDay && formatDateKey(selectedDay) === formatDateKey(date);
                                  setSelectedDay(isSame ? null : date);
                                  setGiroDate(isSame ? new Date() : date);
                                  setHoveredApptId(null);
                                }
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
                                <WhatsAppIcon className="h-3 w-3 text-[#25D366]" /> WhatsApp
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
                <div className="space-y-2">
                  {groupedMeasurements.map(([type, items]) => {
                    const pi = productIcons[type] || { emoji: '📦', color: '#6b7280' };
                    const isOpen = expandedProductTypes.has(type);
                    return (
                      <div key={type} className="rounded-xl border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleProductType(type)}
                          className="w-full flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center justify-center rounded-lg w-9 h-9 shrink-0" style={{ backgroundColor: `${pi.color}20` }}>
                            <span className="text-xl">{pi.emoji}</span>
                          </div>
                          <span className="font-semibold text-foreground flex-1 text-left">{productLabels[type] || type}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{items.length} {items.length === 1 ? 'misurazione' : 'misurazioni'}</Badge>
                          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1 shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1 shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="border-t border-border divide-y divide-border">
                            {items.map((m: Measurement) => {
                    const photos: string[] = m.photo_urls || [];
                    const isGrouped = !!m.order_group_id;
                    const itemIndex = m.order_item_index;
                    const totalItems = m.order_total_items;
                    return (
                      <div key={m.id} className="flex items-center gap-4 px-4 py-4 bg-card">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: pi.color }} />
                              <span className="font-semibold text-foreground">{m.client_name || 'Senza nome'}</span>
                              <Badge variant={statusLabels[m.status]?.variant || 'default'}>{statusLabels[m.status]?.label || m.status}</Badge>
                              {isGrouped && <Badge variant="outline" className="text-[10px] gap-1">📦 {itemIndex}/{totalItems}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">{m.width_mm}×{m.height_mm} mm</p>
                            {m.client_address && <p className="text-xs text-muted-foreground">{m.client_address}</p>}
                            {(m.estimated_price ?? 0) > 0 && (
                              <p className="text-xs font-medium text-accent mt-0.5">Prezzo stimato: €{Number(m.estimated_price).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
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
                          <div className="flex items-center gap-1 shrink-0">
                            {m.status === 'bozza' && (
                              <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => navigate(`/misurazione/${m.id}/modifica`)} title="Modifica">
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => navigate(`/misurazione/${m.id}/stampa`)} title="Stampa/PDF">
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => navigate(`/misurazione/${m.id}`)} title="Visualizza">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right text-sm text-muted-foreground whitespace-nowrap shrink-0">
                            {new Date(m.created_at).toLocaleDateString('it-IT')}
                          </div>
                      </div>
                    );
                  })}
                          </div>
                        )}
                      </div>
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
            <div id="app-footer" className="mt-2 -mx-6 -mb-6 bg-foreground text-background">
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
        <DialogContent className="max-w-5xl w-[95vw] flex flex-col" style={{ maxHeight: '90dvh' }}>
          <DialogHeader className="shrink-0">
            <div className="flex items-center gap-2 pr-8 flex-wrap">
              <DialogTitle className="font-heading flex items-center gap-2 flex-1 min-w-0">
                <MapPin className="h-4 w-4 text-accent shrink-0" />
                <span className="truncate">{giroLabelFull}</span>
              </DialogTitle>
              <a
                href={buildGoogleMapsUrl(todayAllAppointments)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shrink-0"
              >
                <Navigation className="h-3.5 w-3.5" /> Naviga
              </a>
              <button
                onClick={() => sendWhatsAppGiro(todayAllAppointments, giroDateStr)}
                disabled={sendingWA}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors shrink-0"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" /> {sendingWA ? 'Invio…' : 'WhatsApp'}
              </button>
            </div>
          </DialogHeader>

          {/* Lista appuntamenti — compatta, scorribile, max 35% altezza */}
          <div className="shrink-0 space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: '30dvh' }}>
            {todayAllAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun appuntamento.</p>
            ) : todayAllAppointments.map(appt => (
              <div
                key={appt.id}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-default transition-colors ${hoveredApptId === appt.id ? 'border-accent/60 bg-accent/5' : 'border-border'}`}
                onMouseEnter={() => setHoveredApptId(appt.id)}
                onMouseLeave={() => setHoveredApptId(null)}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: appt.color || '#94a3b8' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{appt.title}</p>
                  <p className="text-xs text-muted-foreground">{APPOINTMENT_TYPES[appt.type]?.label}{appt.time ? ` · ${appt.time}` : ''}{appt.location ? ` · ${appt.location}` : ''}</p>
                </div>
                <button onClick={() => setEditingAppointment(appt)} className="text-muted-foreground hover:text-accent shrink-0">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Mappa — occupa tutto lo spazio rimanente */}
          <div className="flex-1 min-h-0" style={{ minHeight: '200px' }}>
            {mapMounted && <AppointmentMap appointments={todayMapAppointments} hoveredId={hoveredApptId} />}
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
              {([
                { label: 'Pratelli Rappresentanze (admin)', email: ADMIN_EMAIL },
                ...(profile?.email && profile.email !== ADMIN_EMAIL
                  ? [{ label: profile.company_name || 'Tuo account', email: profile.email }]
                  : []),
              ] as { label: string; email: string }[]).map(({ label, email }) => (
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
              {emailSelected.filter(e => e !== ADMIN_EMAIL && e !== profile?.email).map(email => (
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

      {/* Dialog selezione destinatari WhatsApp */}
      <Dialog open={!!waDialog} onOpenChange={open => { if (!open) setWaDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <WhatsAppIcon className="h-5 w-5 text-[#25D366]" />
              Invia giro su WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seleziona i numeri a cui inviare il riepilogo degli appuntamenti.
            </p>
            {/* Numero dal profilo */}
            {profile?.phone?.trim() && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">NUMERO DAL TUO PROFILO</p>
                <button
                  type="button"
                  onClick={() => setWaNumbers(prev =>
                    prev.includes(profile.phone!) ? prev.filter(n => n !== profile.phone!) : [...prev, profile.phone!]
                  )}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    waNumbers.includes(profile.phone!) ? 'border-[#25D366] bg-[#25D366]/5 text-[#128C7E]' : 'border-border hover:bg-muted'
                  }`}
                >
                  <span className="font-medium">{profile.company_name || 'Il mio numero'}</span>
                  <span className="text-xs text-muted-foreground font-mono">{profile.phone}</span>
                </button>
              </div>
            )}
            {/* Aggiungi numero */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">AGGIUNGI NUMERO</p>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="+39 333 1234567"
                  value={waCustomInput}
                  onChange={e => setWaCustomInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && waCustomInput.trim()) {
                      const n = waCustomInput.trim();
                      setWaNumbers(prev => prev.includes(n) ? prev : [...prev, n]);
                      setWaCustomInput('');
                    }
                  }}
                />
                <Button variant="outline" onClick={() => {
                  const n = waCustomInput.trim();
                  if (n) { setWaNumbers(prev => prev.includes(n) ? prev : [...prev, n]); setWaCustomInput(''); }
                }}>Aggiungi</Button>
              </div>
              {/* Numeri aggiuntivi */}
              {waNumbers.filter(n => n !== profile?.phone).map(n => (
                <div key={n} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-mono">
                  <span>{n}</span>
                  <button type="button" onClick={() => setWaNumbers(prev => prev.filter(x => x !== n))} className="text-muted-foreground hover:text-destructive text-xs ml-2">✕</button>
                </div>
              ))}
            </div>
            {/* Anteprima count appuntamenti */}
            {waDialog && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                📅 Verrà inviato il riepilogo di <strong>{waDialog.appointments.length} appuntament{waDialog.appointments.length === 1 ? 'o' : 'i'}</strong>.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setWaDialog(null)}>Annulla</Button>
            <Button
              onClick={confirmSendWhatsApp}
              disabled={sendingWA || waNumbers.length === 0}
              className="gap-1.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white"
            >
              <WhatsAppIcon className="h-4 w-4" />
              {sendingWA ? 'Invio...' : `Invia a ${waNumbers.length} numer${waNumbers.length === 1 ? 'o' : 'i'}`}
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card shadow-surface flex flex-col justify-between overflow-hidden"
         style={{ minHeight: 130 }}>
      {/* Gold top accent line */}
      <div style={{ height: 2, background: 'linear-gradient(90deg, hsl(28 55% 54% / 0.7), transparent)' }} />
      <div className="px-6 pb-6 pt-4 flex flex-col justify-between flex-1">
        <div className="flex items-start justify-between mb-3">
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'hsl(var(--muted-foreground))',
          }}>{label}</p>
          <div className="h-6 w-6 rounded-md flex items-center justify-center"
               style={{ background: 'hsl(28 55% 54% / 0.12)' }}>
            <Icon className="h-3 w-3" style={{ color: 'hsl(28 55% 64%)' }} />
          </div>
        </div>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 44,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          color: 'hsl(var(--foreground))',
          fontVariantNumeric: 'tabular-nums',
        }}>{value}</p>
      </div>
    </div>
  );
}

