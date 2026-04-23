import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'onboarding@resend.dev';
const ADMIN_EMAIL = '2002lavoro@gmail.com';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_LABELS: Record<string, string> = {
  finestra: 'Finestra', porta_finestra: 'Porta finestra', porta: 'Porta',
  basculante: 'Basculante', zanzariera: 'Zanzariera', persiana: 'Persiana',
  porta_finestrata: 'Porta finestrata', porta_filomuro: 'Porta filomuro',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { clientName, clientAddress, productType, dimensions, estimatedPrice, measurement } = await req.json();

    const productLabel = PRODUCT_LABELS[productType] || productType || 'Prodotto';
    const priceText = estimatedPrice ? `€${Number(estimatedPrice).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : null;

    const detailRows = measurement ? [
      measurement.material && ['Materiale', measurement.material],
      measurement.color_internal && ['Colore interno', measurement.color_internal],
      measurement.color_external && ['Colore esterno', measurement.color_external],
      measurement.glass_type && ['Vetro', measurement.glass_type],
      measurement.frame_type && ['Telaio', measurement.frame_type],
      measurement.handle_type && ['Maniglia', measurement.handle_type],
      measurement.installation_type && ['Installazione', measurement.installation_type],
      measurement.notes && ['Note', measurement.notes],
    ].filter(Boolean) as [string, string][] : [];

    const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f8fc;margin:0;padding:32px">
<div style="max-width:580px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:28px 32px">
    <p style="color:#f97316;font-size:13px;font-weight:600;margin:0 0 4px">PRATELLI RAPPRESENTANZE</p>
    <h1 style="color:white;font-size:22px;margin:0">📐 Nuova misurazione ricevuta</h1>
    <p style="color:rgba(255,255,255,.7);font-size:13px;margin:8px 0 0">Un cliente ha inviato una nuova misurazione</p>
  </div>
  <div style="padding:32px">
    <div style="background:#f0f9ff;border-left:4px solid #f97316;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="font-size:13px;color:#666;margin:0 0 4px">PRODOTTO</p>
      <p style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0">${productLabel}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;font-size:13px;color:#888">Cliente</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${clientName || '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;font-size:13px;color:#888">Indirizzo installazione</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${clientAddress || '—'}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;font-size:13px;color:#888">Dimensioni</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${dimensions || '—'}</td>
      </tr>
      ${priceText ? `<tr>
        <td style="padding:10px 0;font-size:13px;color:#888">Prezzo stimato</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#f97316;text-align:right">${priceText}</td>
      </tr>` : ''}
    </table>
    ${detailRows.length > 0 ? `
    <p style="font-size:13px;font-weight:600;color:#1a1a2e;margin-bottom:8px">Configurazione</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      ${detailRows.map(([label, value]) => `
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:8px 0;font-size:12px;color:#888">${label}</td>
        <td style="padding:8px 0;font-size:12px;font-weight:500;color:#1a1a2e;text-align:right">${value}</td>
      </tr>`).join('')}
    </table>` : ''}
    <p style="font-size:13px;color:#888;margin:0">Accedi al pannello admin per gestire la misurazione.</p>
  </div>
  <div style="background:#f8f8fc;padding:20px 32px;text-align:center">
    <p style="font-size:11px;color:#aaa;margin:0">Pratelli Rappresentanze SRL — Notifica automatica</p>
  </div>
</div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `[Pratelli] Nuova misurazione — ${clientName || 'Cliente'} • ${productLabel}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...CORS } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
