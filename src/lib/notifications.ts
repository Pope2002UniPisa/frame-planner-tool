import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type NotificationType = 'appointment' | 'measurement' | 'payment' | 'status' | 'info';

interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  whatsapp?: boolean;      // invia anche su WhatsApp (default: false)
  whatsappMessage?: string; // testo custom per WhatsApp (default: usa title + body)
}

export async function createNotification(opts: CreateNotificationOptions): Promise<void> {
  const { userId, type, title, body, metadata, whatsapp = false, whatsappMessage } = opts;

  // 1. Notifica in-app su Supabase
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    metadata: (metadata ?? null) as Json,
  });

  if (error) {
    console.error('[createNotification] Errore salvataggio notifica:', error.message);
  }

  // 2. WhatsApp via Edge Function (solo se richiesto)
  if (whatsapp) {
    const message = whatsappMessage ?? `${title}${body ? `\n${body}` : ''}`;
    try {
      await supabase.functions.invoke('send-whatsapp', {
        body: { message },
      });
    } catch (err) {
      // Non bloccare il flusso se WhatsApp fallisce
      console.warn('[createNotification] WhatsApp non inviato:', err);
    }
  }
}
