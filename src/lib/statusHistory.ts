/**
 * statusHistory.ts
 * Helper per registrare ogni cambio di stato di una misurazione.
 * Va chiamato subito dopo ogni UPDATE su measurements.status.
 */
import { supabase } from '@/integrations/supabase/client';

export async function recordStatusChange(
  measurementId: string,
  oldStatus: string | null,
  newStatus: string,
  note?: string,
) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('status_history').insert({
    measurement_id: measurementId,
    old_status: oldStatus ?? null,
    new_status: newStatus,
    changed_by: user?.id ?? null,
    note: note ?? null,
  });
  if (error) console.error('[statusHistory] insert error:', error.message);
}
