import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_FROM        = Deno.env.get('TWILIO_WHATSAPP_FROM');   // es. whatsapp:+14155238886
    const TWILIO_DEFAULT_TO  = Deno.env.get('TWILIO_WHATSAPP_TO');    // fallback numero admin

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM) {
      console.log('[send-whatsapp] Credenziali Twilio non configurate — messaggio non inviato');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Twilio not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fix #6: ora accetta 'to' opzionale dal body
    // Se non passato, usa il numero di default configurato via env
    const { message, to } = await req.json() as { message: string; to?: string };

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo "message" mancante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 'to' può essere un numero nudo (+39...) o già in formato whatsapp:+39...
    const toNumber = to
      ? (to.startsWith('whatsapp:') ? to : `whatsapp:${to}`)
      : TWILIO_DEFAULT_TO;

    if (!toNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Destinatario WhatsApp non configurato' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = new URLSearchParams({
      From: TWILIO_FROM,
      To:   toNumber,
      Body: message,
    });

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    const result = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error('[send-whatsapp] Twilio error:', result);
      return new Response(
        JSON.stringify({ success: false, error: result.message ?? 'Errore Twilio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sid: result.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[send-whatsapp] Errore:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
