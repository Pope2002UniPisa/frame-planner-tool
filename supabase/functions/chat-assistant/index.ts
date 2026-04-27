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

// Models tried in order until one responds successfully
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

async function callGemini(
  apiKey: string,
  model: string,
  contents: { role: string; parts: { text: string }[] }[]
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
      }),
    }
  );
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ reply: 'API key non configurata. Contatta l\'amministratore.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages } = await req.json();

    // Convert to Gemini format: user/model roles, starts with user, no consecutive same-role
    const rawContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const firstUserIdx = rawContents.findIndex((m: { role: string }) => m.role === 'user');
    const sliced = firstUserIdx >= 0 ? rawContents.slice(firstUserIdx) : rawContents;

    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of sliced) {
      if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
        contents[contents.length - 1].parts[0].text += '\n' + msg.parts[0].text;
      } else {
        contents.push({ ...msg, parts: [{ text: msg.parts[0].text }] });
      }
    }

    // Try each model until one works
    let lastError = '';
    for (const model of GEMINI_MODELS) {
      console.log(`Trying model: ${model}`);
      const { ok, status, data } = await callGemini(GEMINI_API_KEY, model, contents);

      if (status === 404 || status === 400) {
        lastError = data?.error?.message || `HTTP ${status}`;
        console.log(`Model ${model} not available (${status}), trying next...`);
        continue;
      }

      if (!ok) {
        lastError = data?.error?.message || `HTTP ${status}`;
        console.error(`Model ${model} error:`, JSON.stringify(data));
        continue;
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!reply) {
        const blockReason = data.promptFeedback?.blockReason;
        lastError = blockReason ? `Risposta bloccata: ${blockReason}` : 'Nessuna risposta';
        console.log(`Model ${model} returned no reply:`, JSON.stringify(data));
        continue;
      }

      console.log(`Success with model: ${model}`);
      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // All models failed
    return new Response(JSON.stringify({ reply: `Servizio temporaneamente non disponibile. Riprova tra qualche minuto. (${lastError})` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Edge function error:', String(err));
    return new Response(JSON.stringify({ reply: `Errore interno: ${String(err)}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
