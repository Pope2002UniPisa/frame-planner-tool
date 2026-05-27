/**
 * chat-assistant — Silvia AI con dati reali + azioni (Fix #7 + #9)
 *
 * Novità:
 * - Riceve userId dal body → inietta misurazioni e appuntamenti reali nel system prompt
 * - Riconosce intenzioni strutturate (create_appointment, update_status, send_notification)
 * - Risponde con { reply, action? } per permettere al frontend di eseguire l'azione
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const BASE_SYSTEM_PROMPT = `Sei Silvia, l'assistente AI agente del Portale Misurazioni di Pratelli Rappresentanze.
Sei esperta di serramenti, infissi, porte e finestre.
Rispondi SEMPRE in italiano, in modo conciso e professionale (max 3-4 frasi o bullet point).

CAPACITÀ OPERATIVE — puoi eseguire azioni reali:
- Creare appuntamenti nel calendario
- Aggiornare lo stato di una misurazione
- Inviare notifiche all'utente

QUANDO l'utente chiede di creare un appuntamento, rispondi con JSON strutturato:
{"reply":"Creo subito l'appuntamento!","action":{"type":"create_appointment","data":{"title":"...","date":"YYYY-MM-DD","type":"consegna|chiamata|pagamento|sopralluogo|altro","time":"HH:MM"}}}

QUANDO chiede di cambiare lo stato di una misurazione (usa measurementId dai dati sotto):
{"reply":"Aggiorno lo stato!","action":{"type":"update_status","data":{"measurementId":"...","oldStatus":"...","newStatus":"..."}}}

QUANDO chiede di inviare una notifica/promemoria:
{"reply":"Invio la notifica!","action":{"type":"send_notification","data":{"title":"...","body":"..."}}}

Altrimenti rispondi con testo normale (NON JSON).

STRUTTURA DEL PORTALE:
- Dashboard: KPI, giro del giorno, calendario, lista misurazioni
- Flusso ordine: Bozza → Inviata → Preventivo → Ordine confermato → In produzione → Pronta per consegna → Completata
- Contatti: Via Livornese Ovest 22/A, 56035 Casciana Terme Lari (PI) — PEC: farewellsrl@pec.cgn.it`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) {
      return json({ reply: "Chiave API non configurata. Contatta l'amministratore." }, 500);
    }

    const { messages, userId } = await req.json();

    // ── Fix #7: Inietta dati reali dell'utente nel system prompt ────────────
    let userContext = '';
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const [{ data: measurements }, { data: appointments }] = await Promise.all([
          supabase
            .from('measurements')
            .select('id, client_name, status, product_type, estimated_delivery_date, estimated_price')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('appointments')
            .select('id, title, date, time, type, location')
            .eq('user_id', userId)
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true })
            .limit(5),
        ]);

        userContext = `

DATI REALI OPERATORE (usa queste informazioni per rispondere con precisione):
Data/ora attuale: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}

Misurazioni recenti (ultime 10):
${JSON.stringify(measurements ?? [], null, 2)}

Prossimi appuntamenti:
${JSON.stringify(appointments ?? [], null, 2)}
`;
      } catch (e) {
        console.error('Errore fetch dati utente:', e);
      }
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + userContext;

    const conversation = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: conversation,
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg: string = data?.error?.message || `HTTP ${res.status}`;
      const isQuota = res.status === 429;
      return json({ reply: isQuota ? 'Troppe richieste. Riprova tra qualche secondo.' : `Errore: ${errMsg.split('.')[0]}` });
    }

    const rawReply = data.choices?.[0]?.message?.content;
    if (!rawReply) return json({ reply: 'Nessuna risposta generata. Riprova.' });

    // ── Fix #9: Tenta di parsare JSON per azioni strutturate ────────────────
    try {
      // Cerca un blocco JSON nella risposta (Groq può aggiungere testo prima/dopo)
      const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.reply && parsed.action) {
          return json(parsed); // { reply: string, action: { type, data } }
        }
      }
    } catch {
      // Non è JSON strutturato — risposta testuale normale
    }

    return json({ reply: rawReply });

  } catch (err) {
    console.error('Edge function error:', String(err));
    return json({ reply: `Errore interno: ${String(err)}` }, 500);
  }
});
