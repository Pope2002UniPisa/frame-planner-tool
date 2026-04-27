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

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key non configurata. Contatta l\'amministratore.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages } = await req.json();

    // Convert from Anthropic format (user/assistant) to Gemini format (user/model)
    // Gemini requires: conversation starts with 'user', no consecutive same-role messages
    const rawContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Skip leading 'model' messages — Gemini requires first message to be 'user'
    const firstUserIdx = rawContents.findIndex((m: { role: string }) => m.role === 'user');
    const sliced = firstUserIdx >= 0 ? rawContents.slice(firstUserIdx) : rawContents;

    // Merge consecutive same-role messages to avoid Gemini validation errors
    const contents: { role: string; parts: { text: string }[] }[] = [];
    for (const msg of sliced) {
      if (contents.length > 0 && contents[contents.length - 1].role === msg.role) {
        contents[contents.length - 1].parts[0].text += '\n' + msg.parts[0].text;
      } else {
        contents.push({ ...msg, parts: [{ text: msg.parts[0].text }] });
      }
    }

    console.log('Calling Gemini, contents:', contents.length, 'messages');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
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

    const data = await response.json();
    console.log('Gemini status:', response.status, 'ok:', response.ok);

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      console.error('Gemini API error:', JSON.stringify(data));
      return new Response(JSON.stringify({ reply: `Errore Gemini (${response.status}): ${errMsg}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      console.error('No candidates in Gemini response:', JSON.stringify(data));
      const blockReason = data.promptFeedback?.blockReason;
      return new Response(JSON.stringify({ reply: blockReason ? `Risposta bloccata: ${blockReason}` : 'Nessuna risposta generata. Riprova.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Edge function error:', String(err));
    return new Response(JSON.stringify({ reply: `Errore interno: ${String(err)}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
