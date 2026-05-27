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
