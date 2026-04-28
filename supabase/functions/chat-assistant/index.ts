import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Sei Silvia, l'assistente virtuale del Portale Misurazioni di Pratelli Rappresentanze.
Aiuti i rivenditori autorizzati con domande relative a:
- Come inserire e gestire le misurazioni
- Gestione ordini, preventivi, consegne e pagamenti
- Funzionalità del portale (calendario appuntamenti, profilo, admin)
- Prodotti trattati: finestre, porte finestra, porte, basculanti, zanzariere, persiane
- Fornitori: FerreroLegno SPA, Madrugada Group, Nurith SPA, Denardi SRL, Anger SRL
- Pratelli Rappresentanze — FAREWELL SRL, P.IVA 02484510504, Via Livornese Ovest 22/A, 56035 Casciana Terme Lari (PI), PEC: farewellsrl@pec.cgn.it

Rispondi sempre in italiano, in modo professionale e conciso. Presentati come Silvia quando ti viene chiesto chi sei.
Per domande che esulano dal portale, indirizza l'utente a contattare direttamente l'azienda via PEC o telefono.`;

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

    const { messages } = await req.json();

    // Build conversation in OpenAI format (Groq is OpenAI-compatible)
    const conversation = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role, // 'user' or 'assistant'
        content: m.content,
      })),
    ];

    console.log('Calling Groq, messages:', conversation.length);

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
    console.log('Groq status:', res.status);

    if (!res.ok) {
      const errMsg: string = data?.error?.message || `HTTP ${res.status}`;
      console.error('Groq error:', errMsg);
      const isQuota = res.status === 429;
      return json({ reply: isQuota ? 'Troppe richieste. Riprova tra qualche secondo.' : `Errore: ${errMsg.split('.')[0]}` });
    }

    const reply = data.choices?.[0]?.message?.content;
    if (!reply) {
      return json({ reply: 'Nessuna risposta generata. Riprova.' });
    }

    return json({ reply });

  } catch (err) {
    console.error('Edge function error:', String(err));
    return json({ reply: `Errore interno: ${String(err)}` }, 500);
  }
});
