/**
 * agent-action — esegue le azioni richieste da Silvia AI (Fix #9 + #10)
 *
 * Azioni supportate:
 *   create_appointment  — crea un appuntamento nel calendario
 *   update_status       — aggiorna lo stato di una misurazione + registra in status_history
 *   send_notification   — notifica in-app + WhatsApp al numero del profilo (non hardcoded)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, userId } = await req.json() as {
      action: { type: string; data: Record<string, any> };
      userId: string;
    };

    if (!action || !userId) return json({ error: 'action e userId obbligatori' }, 400);

    let result: Record<string, any> = { message: 'Azione non riconosciuta' };

    // ── Crea appuntamento ───────────────────────────────────────────────────
    if (action.type === 'create_appointment') {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          user_id: userId,
          title:    action.data.title,
          date:     action.data.date,
          type:     action.data.type ?? 'altro',
          time:     action.data.time ?? null,
          location: action.data.location ?? null,
          color: {
            consegna:   '#f59e0b',
            chiamata:   '#10b981',
            pagamento:  '#ef4444',
            sopralluogo:'#3b82f6',
            altro:      '#8b5cf6',
          }[action.data.type ?? 'altro'] ?? '#8b5cf6',
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500);
      result = { message: `✅ Appuntamento "${action.data.title}" creato per il ${action.data.date}`, appointment: data };
    }

    // ── Aggiorna stato misurazione ──────────────────────────────────────────
    if (action.type === 'update_status') {
      const { error } = await supabase
        .from('measurements')
        .update({ status: action.data.newStatus })
        .eq('id', action.data.measurementId)
        .eq('user_id', userId);

      if (error) return json({ error: error.message }, 500);

      // Registra in status_history
      await supabase.from('status_history').insert({
        measurement_id: action.data.measurementId,
        old_status:     action.data.oldStatus ?? null,
        new_status:     action.data.newStatus,
        changed_by:     userId,
        note:           'Aggiornato da Silvia AI',
      });

      result = { message: `✅ Stato aggiornato a "${action.data.newStatus}"` };
    }

    // ── Invia notifica ──────────────────────────────────────────────────────
    if (action.type === 'send_notification') {
      // Notifica in-app
      await supabase.from('notifications').insert({
        user_id: userId,
        type:    'info',
        title:   action.data.title,
        body:    action.data.body ?? '',
      });

      // Fix #10: WhatsApp al numero del PROFILO, non hardcoded
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('user_id', userId)
        .single();

      if (profile?.phone) {
        await supabase.functions.invoke('send-whatsapp', {
          body: {
            message: `${action.data.title}\n${action.data.body ?? ''}`,
            to: profile.phone, // numero dinamico dal profilo
          },
        });
      }

      result = { message: '✅ Notifica inviata' };
    }

    return json({ ok: true, ...result });

  } catch (err) {
    console.error('[agent-action] errore:', err);
    return json({ error: String(err) }, 500);
  }
});
