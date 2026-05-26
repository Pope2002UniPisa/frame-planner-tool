export const productLabels: Record<string, string> = {
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

export const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
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

export const WORKFLOW_STEPS = [
  { key: 'bozza', label: 'Bozza', icon: '📝' },
  { key: 'quoted', label: 'Preventivo', icon: '💰' },
  { key: 'ordered', label: 'Ordine', icon: '📋' },
  { key: 'in_production', label: 'Produzione', icon: '✅' },
  { key: 'delivering', label: 'Consegna', icon: '📦' },
  { key: 'completed', label: 'Completata', icon: '🏁' },
];

export const getWorkflowIndex = (status: string): number => {
  const map: Record<string, number> = {
    bozza: 0, ricevuto: 1, submitted: 1, quoted: 1,
    quote_modifications: 1, quote_accepted: 2, ordered: 2,
    in_production: 3, delivering: 4, completed: 5,
  };
  return map[status] ?? 0;
};

export const productIcons: Record<string, { emoji: string; color: string }> = {
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

// Tipi appuntamento con colori associati
export const APPOINTMENT_TYPES: Record<string, { label: string; color: string }> = {
  consegna: { label: 'Consegna', color: '#f59e0b' },
  chiamata: { label: 'Chiamata', color: '#10b981' },
  pagamento: { label: 'Pagamento', color: '#ef4444' },
  sopralluogo: { label: 'Sopralluogo', color: '#3b82f6' },
  altro: { label: 'Altro', color: '#8b5cf6' },
};

// Nomi dei mesi in italiano
export const MONTH_NAMES = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

// Email amministratore
export const ADMIN_EMAIL = '2002lavoro@gmail.com';
