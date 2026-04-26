import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Sei l'assistente virtuale del Portale Misurazioni di Pratelli Rappresentanze.
Aiuti i rivenditori autorizzati con domande relative a:
- Come inserire e gestire le misurazioni
- Gestione ordini, preventivi, consegne e pagamenti
- Funzionalità del portale (calendario appuntamenti, profilo, admin)
- Prodotti trattati: finestre, porte finestra, porte, basculanti, zanzariere, persiane
- Fornitori: FerreroLegno SPA, Madrugada Group, Nurith SPA, Denardi SRL, Anger SRL
- Pratelli Rappresentanze — FAREWELL SRL, P.IVA 02484510504, Via Livornese Ovest 22/A, 56035 Casciana Terme Lari (PI), PEC: farewellsrl@pec.cgn.it

Rispondi sempre in italiano, in modo professionale e conciso. Per domande che esulano dal portale, indirizza l'utente a contattare direttamente l'azienda via PEC o telefono.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'API key non configurata. Contatta l\'amministratore.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Mi dispiace, non ho potuto elaborare la risposta.';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
