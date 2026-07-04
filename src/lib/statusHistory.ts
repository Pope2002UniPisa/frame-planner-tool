/**
 * statusHistory.ts
 * Lo storico dei cambi di stato è ora garantito da un trigger DB
 * (log_measurement_status_change) che inserisce una riga in status_history a
 * ogni UPDATE di measurements.status — nessun buco anche se l'app dimentica.
 *
 * Questo helper NON inserisce più (eviterebbe duplicati): si limita ad
 * annotare con la `note` la riga appena creata dal trigger, quando serve.
 */
import { supabase } from '@/integrations/supabase/client';

export async function recordStatusChange(
  measurementId: string,
  _oldStatus: string | null,
  newStatus: string,
  note?: string,
) {
  if (!note) return; // il trigger ha già registrato old/new/changed_by/changed_at
  const { data: rows } = await supabase
    .from('status_history')
    .select('id')
    .eq('measurement_id', measurementId)
    .eq('new_status', newStatus)
    .order('changed_at', { ascending: false })
    .limit(1);
  const rowId = (rows as { id: string }[] | null)?.[0]?.id;
  if (!rowId) return;
  const { error } = await supabase.from('status_history').update({ note }).eq('id', rowId);
  if (error) console.error('[statusHistory] note update error:', error.message);
}
