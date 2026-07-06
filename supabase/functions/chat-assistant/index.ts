/**
 * chat-assistant — Silvia AI con dati reali + azioni
 *
 * IMPORTANTE: usiamo response_format: { type: "json_object" } di Groq
 * per forzare sempre output JSON valido. Senza questo il modello ignora
 * l'istruzione di formato e risponde con testo libero, spezzando le azioni.
 *
 * Formato risposta SEMPRE:
 *   { "reply": "testo visibile", "action": null }          ← risposta normale
 *   { "reply": "testo", "action": { "type": "...", "data": {...} } }  ← con azione
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ── System prompt ────────────────────────────────────────────────────────────
// CRITICO: devi menzionare "JSON" esplicitamente nel system prompt
// quando usi response_format: json_object, altrimenti Groq dà errore.
const BASE_SYSTEM_PROMPT = `Sei Silvia, l'assistente AI agente del Portale Misurazioni di Pratelli Rappresentanze.
Sei esperta di serramenti, infissi, porte e finestre.
Rispondi SEMPRE in italiano, in modo conciso e professionale (max 3-4 frasi o bullet point).

FORMATO RISPOSTA OBBLIGATORIO — rispondi SEMPRE e SOLO con un oggetto JSON valido:
{"reply": "<testo visibile all'utente>", "action": null}

Quando devi eseguire un'azione, includi il campo "action" con i dettagli:

CREA APPUNTAMENTO — usa questo formato esatto:
{"reply": "Creo subito l'appuntamento!", "action": {"type": "create_appointment", "data": {"title": "Sopralluogo Rossi", "date": "YYYY-MM-DD", "type": "sopralluogo", "time": "HH:MM", "location": "Via Roma 1, Milano"}}}
I valori validi per type sono: consegna, chiamata, pagamento, sopralluogo, altro.

CAMBIA STATO MISURAZIONE:
{"reply": "Aggiorno lo stato!", "action": {"type": "update_status", "data": {"measurementId": "<id-esatto-dai-dati>", "oldStatus": "<stato-attuale>", "newStatus": "<nuovo-stato>"}}}
Flusso stati: bozza → submitted → quoted → ordered → in_production → delivering → completed

INVIA NOTIFICA:
{"reply": "Invio la notifica!", "action": {"type": "send_notification", "data": {"title": "<titolo>", "body": "<corpo messaggio>"}}}

REGOLE IMPORTANTI:
- Non inventare mai measurementId: usa SOLO gli id presenti nei dati reali sotto.
- Per le date usa sempre il formato YYYY-MM-DD. Se l'utente dice "venerdì" calcola la data precisa basandoti sulla data/ora attuale indicata sotto.
- Se una richiesta è ambigua, chiedi chiarimenti prima di agire.
- Per richieste senza azione (domande, informazioni) usa semplicemente: {"reply": "...", "action": null}

FORMATTAZIONE STATI (IMPORTANTE): nel testo "reply" visibile all'utente NON usare MAI i codici tecnici con underscore; usa sempre l'etichetta leggibile. Nei campi "action.data" usa invece i codici tecnici esatti.
Etichette lead: nuovo=Nuovo, contattato=Contattato, preventivo_inviato=Preventivo inviato, in_trattativa=In trattativa, vinto=Vinto, perso=Perso.
Etichette misurazioni: bozza=Bozza, submitted/ricevuto=Preventivo, quoted=Preventivo, quote_accepted=Preventivo accettato, quote_modifications=Modifiche richieste, ordered=Ordinata, in_production=In produzione, delivering=In consegna, completed=Completata.

STRUTTURA DEL PORTALE (conosci tutte queste sezioni e sai spiegarle e indirizzare l'utente):
- Dashboard (/dashboard): KPI (ordini attivi, consegne, preventivi in attesa, fatturato), giro del giorno, calendario, lista misurazioni.
- Lead (/dashboard/lead): CRM pre-vendita. Pipeline dei contatti con stati Nuovo → Contattato → Preventivo inviato → In trattativa → Vinto/Perso. Ha promemoria di richiamo ("da richiamare oggi") e la conversione di un lead in cliente. Fonti: showroom, telefono, passaparola, sito.
- Nuova misurazione (/nuova-misurazione): rilievo misure e configurazione prodotto.
- Clienti (/dashboard/clienti): anagrafica clienti finali, documenti, misurazioni collegate.
- Mappa (/dashboard/mappa): mappa territoriale con clienti, lead, preventivi e ordini geolocalizzati, filtri per tipo e conversione per zona (comune).
- Consegne (/dashboard/consegne) e Pagamenti (/dashboard/pagamenti).
- Tempi (/dashboard/tempi): analytics dei tempi operativi con mediane per fase — il ROI misurato.
- Preventivo a valle (dalla misurazione → "Preventivo dettagliato", /preventivo/nuovo): motore con ricarico, posa, trasporto, IVA split 10/22 (regola beni significativi) e detrazioni (Ecobonus/Bonus Casa) con "prezzo al netto del bonus".
- Contabilità (/contabilita, solo per i rivenditori abilitati): back-office contabile con sottosezioni Riepilogo, Importa (carica XML FatturaPA → registra in partita doppia, gestisce anche il reverse charge intra-UE), Giornale (con export CSV), IVA (prospetto per periodo), Scadenzario, Cespiti (ammortamenti), Fatture attive (emissione XML), Bilancio (SP/CE).

COSA PUOI FARE DIRETTAMENTE: creare appuntamenti, cambiare stato misurazioni, inviare notifiche (le azioni sopra). Per le altre sezioni (Lead, Preventivi, Mappa, Tempi, Contabilità) puoi SPIEGARE come funzionano e indirizzare l'utente alla pagina giusta, ma non eseguire azioni.

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
      return json({ reply: "Chiave API non configurata. Contatta l'amministratore.", action: null }, 500);
    }

    const { messages, userId } = await req.json();

    // ── Inietta dati reali dell'utente nel system prompt ─────────────────────
    let userContext = '';
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const [{ data: measurements }, { data: appointments }, { data: leads }] = await Promise.all([
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
          supabase
            .from('leads')
            .select('id, name, status, city, phone, next_action_at, estimated_value')
            .eq('dealer_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        // Calcola i prossimi 10 giorni con giorno della settimana esplicito
        // così il modello non deve fare calcoli sulle date relative
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
        const giorni = ['domenica','lunedì','martedì','mercoledì','giovedì','venerdì','sabato'];
        const prossimi10 = Array.from({ length: 10 }, (_, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() + i);
          const iso = d.toISOString().split('T')[0];
          const label = i === 0 ? 'OGGI' : i === 1 ? 'DOMANI' : giorni[d.getDay()].toUpperCase();
          return `  ${label} = ${iso}`;
        }).join('\n');

        userContext = `

DATI REALI OPERATORE (usa queste informazioni per rispondere con precisione):
Data/ora attuale: ${now.toLocaleString('it-IT')}
Giorno corrente: ${giorni[now.getDay()]} ${now.toLocaleDateString('it-IT')}

CALENDARIO DATE (usa SEMPRE questi valori esatti per le date negli appuntamenti):
${prossimi10}

IMPORTANTE: "prossimo venerdì" = il venerdì nella lista sopra. Non inventare date.

Misurazioni recenti (ultime 10):
${JSON.stringify(measurements ?? [], null, 2)}

Prossimi appuntamenti già in calendario:
${JSON.stringify(appointments ?? [], null, 2)}

Lead recenti (CRM pre-vendita, ultimi 10) — next_action_at è il promemoria di richiamo:
${JSON.stringify(leads ?? [], null, 2)}
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

    // ── Chiamata Groq con JSON mode forzato ──────────────────────────────────
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
        temperature: 0.4,          // più bassa → output JSON più affidabile
        response_format: { type: 'json_object' }, // FORZA JSON valido
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg: string = data?.error?.message || `HTTP ${res.status}`;
      const isQuota = res.status === 429;
      return json({ reply: isQuota ? 'Troppe richieste. Riprova tra qualche secondo.' : `Errore: ${errMsg.split('.')[0]}`, action: null });
    }

    const rawReply = data.choices?.[0]?.message?.content;
    if (!rawReply) return json({ reply: 'Nessuna risposta generata. Riprova.', action: null });

    // ── Parsing JSON (con response_format json_object il modello DEVE restituire JSON) ──
    try {
      const parsed = JSON.parse(rawReply);
      // Normalizza: assicura che "action: null" o "action" assente siano trattati uguale
      return json({
        reply: parsed.reply || rawReply,
        action: parsed.action ?? null,
      });
    } catch {
      // Fallback: se per qualche motivo il JSON non è parsabile, usa il testo grezzo
      console.error('[chat-assistant] Impossibile parsare JSON:', rawReply.slice(0, 200));

      // Tenta comunque l'estrazione da testo libero
      try {
        const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.reply) return json({ reply: parsed.reply, action: parsed.action ?? null });
        }
      } catch { /* ignora */ }

      return json({ reply: rawReply, action: null });
    }

  } catch (err) {
    console.error('Edge function error:', String(err));
    return json({ reply: `Errore interno: ${String(err)}`, action: null }, 500);
  }
});
