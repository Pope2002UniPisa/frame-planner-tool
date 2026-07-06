import { supabase } from '@/integrations/supabase/client';

// Chiama l'Edge Function geocode-address (Nominatim server-side) e ritorna [lat, lng].
// Passare `city` separatamente migliora la precisione (ricerca strutturata).
export async function geocodeAddress(address: string, city?: string | null): Promise<[number, number] | null> {
  if (!address || !address.trim()) return null;
  try {
    const { data, error } = await supabase.functions.invoke('geocode-address', {
      body: { address: address.trim(), city: city || undefined },
    });
    if (error) return null;
    const lat = (data as { lat: number | null })?.lat;
    const lng = (data as { lng: number | null })?.lng;
    return lat != null && lng != null ? [lat, lng] : null;
  } catch {
    return null;
  }
}

// Compone una stringa indirizzo dai campi disponibili (address + city).
export function buildAddress(parts: { address?: string | null; city?: string | null }): string {
  return [parts.address, parts.city].filter(Boolean).join(', ').trim();
}
