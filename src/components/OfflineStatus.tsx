import { useCallback, useEffect, useState } from 'react';
import { countPending, syncPending, requestPersistentStorage } from '@/lib/offlineQueue';
import { CloudOff, RefreshCw } from 'lucide-react';

/**
 * Indicatore offline + coda di sync. Mostrato solo quando serve (offline oppure
 * ci sono misure in attesa): online e senza coda è invisibile → l'esperienza
 * online resta identica. Sincronizza al rientro online, all'avvio e al click.
 */
export default function OfflineStatus() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => setPending(await countPending()), []);

  const doSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setSyncing(true);
    try { await syncPending(); } finally { setSyncing(false); await refresh(); }
  }, [refresh]);

  useEffect(() => {
    requestPersistentStorage();
    refresh();
    doSync();
    const on = () => { setOnline(true); doSync(); };
    const off = () => setOnline(false);
    const changed = () => refresh();
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('offline-queue-changed', changed);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('offline-queue-changed', changed);
    };
  }, [doSync, refresh]);

  if (online && pending === 0) return null;

  const label = !online
    ? (pending > 0 ? `Offline · ${pending} in attesa` : 'Offline')
    : syncing ? `Sincronizzo ${pending}…` : `${pending} da inviare`;

  return (
    <button
      onClick={() => doSync()}
      disabled={!online || syncing}
      title={online ? 'Tocca per sincronizzare ora' : 'Le misure vengono salvate sul dispositivo e inviate al ritorno online'}
      className={`fixed bottom-4 left-4 z-[1200] flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium shadow-lg backdrop-blur transition-colors ${
        online
          ? 'bg-accent text-accent-foreground hover:bg-accent/90'
          : 'bg-amber-500/95 text-black'
      }`}
    >
      {online
        ? <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
        : <CloudOff className="h-3.5 w-3.5" />}
      <span>{label}</span>
    </button>
  );
}
