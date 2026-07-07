/**
 * Coda offline delle misurazioni (PWA).
 * Quando non c'è rete, la registrazione di una misura viene salvata localmente in
 * IndexedDB (via Dexie), foto incluse come blob. Al ritorno online la coda viene
 * sincronizzata su Supabase e la copia locale cancellata SOLO dopo conferma del
 * server. Online l'app funziona esattamente come prima: la coda entra in gioco
 * solo se offline o se una submit fallisce per mancanza di rete.
 */
import Dexie, { type Table } from 'dexie';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { getErrorMessage, getErrorCode } from '@/lib/errors';

type MeasurementInsert = Database['public']['Tables']['measurements']['Insert'];

export interface PendingRow {
  /** payload pronto per insert in `measurements` (id già assegnato → idempotente). */
  data: MeasurementInsert;
  /** se true riceve i photo_urls caricati in fase di sync. */
  attachPhotos: boolean;
}

export interface PendingMeasurement {
  id?: number;
  localId: string;
  userId: string;
  clientName: string;
  createdAt: number;
  status: 'pending' | 'error';
  lastError?: string;
  photos: { name: string; blob: Blob }[];
  rows: PendingRow[];
}

class OfflineDB extends Dexie {
  pending!: Table<PendingMeasurement, number>;
  constructor() {
    super('measuremaster-offline');
    this.version(1).stores({ pending: '++id, localId, status, createdAt' });
  }
}

export const offlineDb = new OfflineDB();

/** Evento per aggiornare badge/indicatori senza polling aggressivo. */
const notify = () => { try { window.dispatchEvent(new CustomEvent('offline-queue-changed')); } catch { /* SSR */ } };

export async function enqueueMeasurement(entry: Omit<PendingMeasurement, 'id' | 'status' | 'createdAt'>): Promise<number> {
  const id = await offlineDb.pending.add({ ...entry, status: 'pending', createdAt: Date.now() });
  notify();
  return id as number;
}

export async function countPending(): Promise<number> {
  try { return await offlineDb.pending.count(); } catch { return 0; }
}

export async function getAllPending(): Promise<PendingMeasurement[]> {
  return offlineDb.pending.orderBy('createdAt').toArray();
}

let syncing = false;

/**
 * Sincronizza la coda: per ogni misura carica le foto su storage, poi inserisce
 * le righe in un'unica insert (atomica). L'id di ogni riga è pre-assegnato, quindi
 * un eventuale doppio invio genera un conflitto di chiave (23505) che trattiamo
 * come "già sincronizzato". La copia locale si cancella solo dopo successo.
 */
export async function syncPending(): Promise<{ synced: number; failed: number }> {
  if (syncing || typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, failed: 0 };
  // deve esserci una sessione valida per rispettare la RLS
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { synced: 0, failed: 0 };

  syncing = true;
  let synced = 0, failed = 0;
  try {
    const items = await getAllPending();
    for (const it of items) {
      try {
        const urls: string[] = [];
        for (const p of it.photos) {
          const fileName = `${it.userId}/${Date.now()}_${p.name}`;
          const { error } = await supabase.storage.from('measurement-photos').upload(fileName, p.blob);
          if (!error) {
            const { data } = supabase.storage.from('measurement-photos').getPublicUrl(fileName);
            urls.push(data.publicUrl);
          }
        }
        const payload = it.rows.map(r => ({
          ...r.data,
          photo_urls: r.attachPhotos && urls.length ? urls : (r.data.photo_urls ?? null),
        }));
        const { error } = await supabase.from('measurements').insert(payload);
        if (error && getErrorCode(error) !== '23505') throw error; // 23505 = già inserita
        await offlineDb.pending.delete(it.id!);
        synced++;
      } catch (e) {
        await offlineDb.pending.update(it.id!, { status: 'error', lastError: getErrorMessage(e) });
        failed++;
      }
    }
  } finally {
    syncing = false;
    if (synced || failed) notify();
  }
  return { synced, failed };
}

/** Riconosce un errore da mancanza di rete (fetch fallito) per il fallback offline. */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (err instanceof TypeError) return true; // fetch abortito/fallito
  const msg = getErrorMessage(err, '').toLowerCase();
  return /failed to fetch|networkerror|load failed|network request failed|fetch/.test(msg);
}

/** Richiede storage persistente (mitiga lo sfratto della cache su iOS/Safari). */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch { /* non supportato */ }
}
