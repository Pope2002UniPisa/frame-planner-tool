import { supabase } from '@/integrations/supabase/client';

// Bucket delle foto rilievo. È privato: le immagini si mostrano solo tramite
// signed URL a scadenza, mai con URL pubblici.
const BUCKET = 'measurement-photos';
const MARKER = `/${BUCKET}/`;

// La durata di validità di un signed URL (1 ora). Sufficiente per visualizzare
// e stampare; alla riapertura della pagina se ne genera uno nuovo.
const SIGNED_TTL_SECONDS = 60 * 60;

/**
 * Estrae il path storage da un valore salvato in `photo_urls`.
 * I record esistenti contengono l'URL pubblico completo
 * (`.../object/public/measurement-photos/<path>`); qui ne ricaviamo `<path>`.
 * Se il valore non è una foto rilievo (es. immagine portfolio/news su altro
 * bucket) restituisce null → il chiamante lo lascia invariato.
 */
export function extractMeasurementPhotoPath(stored: string): string | null {
  if (!stored) return null;
  const i = stored.indexOf(MARKER);
  if (i === -1) return null;
  return decodeURIComponent(stored.slice(i + MARKER.length).split('?')[0]);
}

/** True se il valore è un riferimento a una foto rilievo (da firmare). */
export function isMeasurementPhoto(stored: string): boolean {
  return !!stored && stored.includes(MARKER);
}

// Cache in memoria dei signed URL già generati, per path. Evita di richiamare
// l'API a ogni re-render / per la stessa foto mostrata in più punti (miniatura
// + lightbox). Si rigenera un po' prima della scadenza reale del token.
const CACHE_TTL_MS = (SIGNED_TTL_SECONDS - 5 * 60) * 1000; // 55 min
const signedCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Converte un valore salvato in un signed URL utilizzabile.
 * - Foto rilievo → signed URL a scadenza (con cache in memoria).
 * - Qualsiasi altro valore → restituito invariato (portfolio/news/pubblici).
 * In caso di errore restituisce il valore originale come fallback.
 */
export async function signMeasurementPhoto(stored: string): Promise<string> {
  const path = extractMeasurementPhotoPath(stored);
  if (!path) return stored;

  const cached = signedCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_TTL_SECONDS);
  if (error || !data) return stored;

  signedCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + CACHE_TTL_MS });
  return data.signedUrl;
}
