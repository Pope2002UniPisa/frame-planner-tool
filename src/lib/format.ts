// Utility di formattazione condivise (italiano).

/** Formatta una durata in secondi come "2g 3h", "5h 12m", "8m", "45s". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return '—';
  const s = Math.round(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return h > 0 ? `${d}g ${h}h` : `${d}g`;
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Formatta un importo in euro all'italiana, es. €1.234,56. */
export function formatEuro(value: number | null | undefined, decimals = 2): string {
  const n = Number(value ?? 0);
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
