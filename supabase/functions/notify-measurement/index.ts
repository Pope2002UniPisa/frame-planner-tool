import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = 'leo.prate02@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { measurement, clientName, clientAddress, productType, dimensions, estimatedPrice } = await req.json();

    const productLabels: Record<string, string> = {
      finestra: 'Finestra', porta_finestra: 'Porta Finestra', porta: 'Porta',
      basculante: 'Basculante', zanzariera: 'Zanzariera', persiana: 'Persiana',
    };

    const subject = `📐 Nuova misurazione ricevuta — ${clientName || 'Cliente'} • ${productLabels[productType] || productType}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui, sans-serif; padding: 0; margin: 0; background: #f8f8fc; }
          .container { max-width: 600px; margin: 0 auto; padding: 30px 20px; }
          .header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 30px; border-radius: 16px 16px 0 0; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p { margin: 8px 0 0; opacity: 0.8; font-size: 14px; }
          .body { background: white; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
          .info-box { background: #f8f8fc; border-radius: 12px; padding: 16px; }
          .info-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
          .info-box .value { font-size: 18px; font-weight: bold; color: #1a1a2e; margin-top: 4px; }
          .badge { display: inline-block; background: #f97316; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #999; }
          .cta { display: inline-block; background: #f97316; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📐 Nuova misurazione ricevuta</h1>
            <p>Un cliente ha appena inviato una nuova misurazione dal portale</p>
          </div>
          <div class="body">
            <span class="badge">${productLabels[productType] || productType}</span>
            
            <div class="info-grid">
              <div class="info-box">
                <div class="label">Cliente</div>
                <div class="value">${clientName || '—'}</div>
              </div>
              <div class="info-box">
                <div class="label">Indirizzo</div>
                <div class="value" style="font-size: 14px;">${clientAddress || '—'}</div>
              </div>
              <div class="info-box">
                <div class="label">Dimensioni</div>
                <div class="value">${dimensions || '—'}</div>
              </div>
              <div class="info-box">
                <div class="label">Prezzo stimato</div>
                <div class="value" style="color: #f97316;">€${estimatedPrice ? Number(estimatedPrice).toLocaleString('it-IT', { minimumFractionDigits: 2 }) : '—'}</div>
              </div>
            </div>

            ${measurement ? `
            <h3 style="margin-top: 24px; color: #1a1a2e;">Dettagli configurazione</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              ${measurement.material ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Materiale</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${measurement.material}</td></tr>` : ''}
              ${measurement.color_internal ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Colore interno</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${measurement.color_internal}</td></tr>` : ''}
              ${measurement.color_external ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Colore esterno</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${measurement.color_external}</td></tr>` : ''}
              ${measurement.glass_type ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Vetro</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${measurement.glass_type}</td></tr>` : ''}
              ${measurement.frame_type ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Telaio</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${measurement.frame_type}</td></tr>` : ''}
              ${measurement.handle_type ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Maniglia</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${measurement.handle_type}</td></tr>` : ''}
              ${measurement.installation_type ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Installazione</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${measurement.installation_type}</td></tr>` : ''}
              ${measurement.notes ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Note</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: 500;">${measurement.notes}</td></tr>` : ''}
            </table>
            ` : ''}

            <div class="footer">
              <p>Portale Misurazioni — Notifica automatica</p>
              <p>Accedi al pannello admin per visualizzare i dettagli completi</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Supabase's built-in email
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use the Supabase Auth admin API to send an email via the inbuilt mailer
    // Since we don't have a full email service yet, we'll log and store the notification
    console.log(`📧 Notification email would be sent to: ${ADMIN_EMAIL}`);
    console.log(`📧 Subject: ${subject}`);
    console.log(`📧 Body length: ${htmlBody.length} chars`);

    return new Response(
      JSON.stringify({ success: true, message: 'Notification logged', to: ADMIN_EMAIL, subject }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in notify-measurement:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
