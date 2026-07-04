import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// ─── Tipi derivati dalle tabelle Supabase ────────────────────────────────────

export type Measurement = Database['public']['Tables']['measurements']['Row'];
export type Appointment  = Database['public']['Tables']['appointments']['Row'];

// Il file types.ts generato non include full_name e dark_mode perché
// queste colonne sono state aggiunte al DB dopo l'ultima rigenerazione dei tipi.
// Li estendiamo manualmente finché non si rigenera il file.
export type Profile = Database['public']['Tables']['profiles']['Row'] & {
  full_name?: string | null;
  dark_mode?: boolean | null;
};

// news ha image_position nel DB ma non nel file tipi generato → estensione locale
export type NewsItem = Database['public']['Tables']['news']['Row'] & {
  image_position?: string | null;
};

export type PortfolioItem = Database['public']['Tables']['portfolio_images']['Row'];

// ─── Query keys centralizzate ────────────────────────────────────────────────

export const QUERY_KEYS = {
  measurements: (userId: string) => ['measurements', userId] as const,
  profile:      (userId: string) => ['profile', userId] as const,
  news:         ['news'] as const,
  portfolio:    ['portfolio'] as const,
  appointments: (userId: string) => ['appointments', userId] as const,
};

// ─── Hook: misurazioni dell'utente ───────────────────────────────────────────

export function useMeasurements(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? QUERY_KEYS.measurements(userId) : ['measurements', null],
    queryFn: async (): Promise<Measurement[]> => {
      const { data, error } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}

// ─── Hook: profilo utente ─────────────────────────────────────────────────────

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? QUERY_KEYS.profile(userId) : ['profile', null],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId!)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
}

// ─── Hook: notizie/promozioni ─────────────────────────────────────────────────

export function useNewsItems() {
  return useQuery({
    queryKey: QUERY_KEYS.news,
    queryFn: async (): Promise<NewsItem[]> => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as NewsItem[];
    },
  });
}

// ─── Hook: immagini portfolio ─────────────────────────────────────────────────

export function usePortfolioImages() {
  return useQuery({
    queryKey: QUERY_KEYS.portfolio,
    queryFn: async (): Promise<PortfolioItem[]> => {
      const { data, error } = await supabase
        .from('portfolio_images')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── Hook: storico stati misurazione ─────────────────────────────────────────

export interface StatusHistoryRow {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  note: string | null;
}

export function useStatusHistory(measurementId: string | undefined) {
  return useQuery({
    queryKey: measurementId ? ['statusHistory', measurementId] : ['statusHistory', null],
    queryFn: async (): Promise<StatusHistoryRow[]> => {
      const { data, error } = await supabase
        .from('status_history')
        .select('id, old_status, new_status, changed_at, note')
        .eq('measurement_id', measurementId!)
        .order('changed_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StatusHistoryRow[];
    },
    enabled: !!measurementId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── CRM Lead ─────────────────────────────────────────────────────────────────
// La tabella `leads` è stata aggiunta dopo l'ultima rigenerazione di types.ts,
// quindi si accede con cast `as any` (stesso pattern di price_catalog/end_clients).

export interface Lead {
  id: string;
  dealer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  source: string;
  status: string;
  estimated_value: number | null;
  next_action_at: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  geocoded_at: string | null;
  converted_client_id: string | null;
  converted_measurement_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  dealer_id: string;
  type: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export function useLeads(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ['leads', userId] : ['leads', null],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from('leads' as any)
        .select('*')
        .eq('dealer_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Lead[];
    },
    enabled: !!userId,
  });
}

// ─── WS2: tempi operativi (mediane per transizione di stato) ─────────────────

export interface StatusTiming {
  dealer_id: string;
  from_status: string | null;
  to_status: string;
  transitions: number;
  median_seconds: number | null;
  avg_seconds: number | null;
}

export function useOperationTimings(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? ['operationTimings', userId] : ['operationTimings', null],
    queryFn: async (): Promise<StatusTiming[]> => {
      const { data, error } = await supabase
        .from('v_status_median_durations' as any)
        .select('*')
        .eq('dealer_id', userId!);
      if (error) throw error;
      return (data ?? []) as unknown as StatusTiming[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

// ─── Hook: appuntamenti utente ────────────────────────────────────────────────

export function useAppointments(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? QUERY_KEYS.appointments(userId) : ['appointments', null],
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId!)
        .order('date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });
}
