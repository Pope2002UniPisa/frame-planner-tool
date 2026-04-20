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
    const TWILIO_FROM        = Deno.env.get('TWILIO_WHATSAPP_FROM'); // es. whatsapp:+14155238886
    const TWILIO_TO          = Deno.env.get('TWILIO_WHATSAPP_TO');   // es. whatsapp:+39XXXXXXXXXX

    // Se le credenziali non sono ancora configurate, logga e restituisce ok silenzioso.
    // Questo evita crash finché non hai il numero Twilio verificato.
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM || !TWILIO_TO) {
      console.log('[send-whatsapp] Credenziali Twilio non configurate — messaggio non inviato (modalità placeholder)');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Twilio not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message } = await req.json() as { message: string };

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo "message" mancante' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = new URLSearchParams({
      From: TWILIO_FROM,
      To: TWILIO_TO,
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

    console.log('[send-whatsapp] Messaggio inviato, SID:', result.sid);
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
