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

// Preferred model name fragments, in order
const MODEL_PREFS = ['gemini-2.0-flash', 'gemini-2.0', 'gemini-1.5-flash', 'gemini-1.5', 'gemini'];

async function discoverModel(apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=50`
    );
    if (!res.ok) {
      console.log('ListModels failed:', res.status);
      return null;
    }
    const data = await res.json();
    const models: any[] = data.models || [];
    console.log('Available models:', models.map((m: any) => m.name).join(', '));

    const capable = models.filter((m: any) =>
      Array.isArray(m.supportedGenerationMethods) &&
      m.supportedGenerationMethods.includes('generateContent')
    );

    for (const pref of MODEL_PREFS) {
      const match = capable.find((m: any) => m.name?.includes(pref));
      if (match) return match.name.replace('models/', '');
    }

    if (capable.length > 0) return capable[0].name.replace('models/', '');
    return null;
  } catch (e) {
    console.log('discoverModel error:', String(e));
    return null;
  }
}

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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return json({ reply: "Chiave API non configurata. Contatta l'amministratore." }, 500);
    }

    const { messages } = await req.json();

    // Build Gemini conversation: starts with user, no consecutive same-role messages
    const rawContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const firstUserIdx = rawContents.findIndex((m: any) => m.role === 'user');
    const sliced = firstUserIdx >= 0 ? rawContents.slice(firstUserIdx) : rawContents;
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of sliced) {
      if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
        contents[contents.length - 1].parts[0].text += '\n' + msg.parts[0].text;
      } else {
        contents.push({ ...msg, parts: [{ text: msg.parts[0].text }] });
      }
    }

    // Discover which model is available for this API key
    const model = await discoverModel(GEMINI_API_KEY);
    if (!model) {
      return json({ reply: 'Nessun modello Gemini disponibile per questa chiave API. Verifica che la chiave sia corretta e che l\'API "Generative Language" sia abilitata nel progetto Google Cloud.' });
    }

    console.log('Using model:', model, '— messages:', contents.length);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
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

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      console.error('Gemini error:', errMsg);
      return json({ reply: `Errore Gemini: ${errMsg}` });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      const blockReason = data.promptFeedback?.blockReason;
      return json({ reply: blockReason ? `Risposta bloccata: ${blockReason}` : 'Nessuna risposta generata. Riprova.' });
    }

    return json({ reply });

  } catch (err) {
    console.error('Edge function error:', String(err));
    return json({ reply: `Errore interno: ${String(err)}` }, 500);
  }
});
