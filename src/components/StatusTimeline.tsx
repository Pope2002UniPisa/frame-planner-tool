/**
 * StatusTimeline — mostra la storia dei cambi di stato di una misurazione.
 * Ogni riga: stato → data/ora → eventuale nota.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { statusLabels } from '@/lib/constants';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

interface HistoryRow {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  note: string | null;
}

// Colore e icona per ogni stato — mantiene coerenza visiva col resto dell'app
const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  bozza:               { color: 'text-gray-500',    bg: 'bg-gray-100 dark:bg-gray-800',     border: 'border-gray-300' },
  ricevuto:            { color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950',       border: 'border-blue-300' },
  submitted:           { color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950',       border: 'border-blue-300' },
  quoted:              { color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950',     border: 'border-amber-300' },
  quote_accepted:      { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-300' },
  quote_modifications: { color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950',   border: 'border-orange-300' },
  in_review:           { color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-950',   border: 'border-purple-300' },
  ordered:             { color: 'text-sky-500',     bg: 'bg-sky-50 dark:bg-sky-950',         border: 'border-sky-300' },
  in_production:       { color: 'text-indigo-500',  bg: 'bg-indigo-50 dark:bg-indigo-950',   border: 'border-indigo-300' },
  delivering:          { color: 'text-orange-500',  bg: 'bg-orange-50 dark:bg-orange-950',   border: 'border-orange-300' },
  completed:           { color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950', border: 'border-emerald-400' },
};

const DEFAULT_CONFIG = { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

interface Props {
  measurementId: string;
}

export function StatusTimeline({ measurementId }: Props) {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!measurementId) return;
    supabase
      .from('status_history')
      .select('id, old_status, new_status, changed_at, note')
      .eq('measurement_id', measurementId)
      .order('changed_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setHistory(data as HistoryRow[]);
        setLoading(false);
      });
  }, [measurementId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Clock className="h-4 w-4 animate-pulse" />
        Caricamento timeline...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Nessun cambio di stato registrato. I prossimi aggiornamenti appariranno qui.
      </p>
    );
  }

  return (
    <ol className="relative">
      {history.map((row, i) => {
        const isLast = i === history.length - 1;
        const cfg = STATUS_CONFIG[row.new_status] ?? DEFAULT_CONFIG;
        const label = statusLabels[row.new_status]?.label ?? row.new_status;
        const { date, time } = formatDateTime(row.changed_at);

        return (
          <li key={row.id} className="flex gap-4">
            {/* Linea verticale + pallino */}
            <div className="flex flex-col items-center">
              <div className={`mt-1 h-7 w-7 rounded-full border-2 ${cfg.border} ${cfg.bg} flex items-center justify-center shrink-0 z-10`}>
                {isLast
                  ? <CheckCircle2 className={`h-4 w-4 ${cfg.color}`} />
                  : <Circle className={`h-3 w-3 ${cfg.color}`} />
                }
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 bg-border my-1" />
              )}
            </div>

            {/* Contenuto */}
            <div className={`mb-5 flex-1 min-w-0 ${isLast ? '' : ''}`}>
              <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                {label}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{date}</span>
                <span>·</span>
                <span>{time}</span>
              </div>
              {row.note && (
                <p className="mt-1.5 text-xs text-muted-foreground bg-muted rounded-md px-2.5 py-1.5 border border-border">
                  📝 {row.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
