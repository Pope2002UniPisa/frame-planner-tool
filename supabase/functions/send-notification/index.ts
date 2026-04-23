import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'onboarding@resend.dev'; // per test; sostituire con dominio verificato su Resend

const STATUS_LABELS: Record<string, string> = {
  quoted: 'Preventivo inviato',
  ordered: 'Ordine confermato',
  in_production: 'In produzione',
  delivering: 'Pronta per consegna',
  completed: 'Completata',
  in_review: 'In revisione',
};

const PRODUCT_LABELS: Record<string, string> = {
  finestra: 'Finestra',
  porta_finestra: 'Porta finestra',
  porta: 'Porta',
  basculante: 'Basculante',
  zanzariera: 'Zanzariera',
  persiana: 'Persiana',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { toEmail, toName, newStatus, productType, clientName, estimatedPrice, estimatedDelivery, notes } = await req.json();

    if (!toEmail || !newStatus) {
      return new Response(JSON.stringify({ error: 'toEmail e newStatus obbligatori' }), { status: 400, headers: CORS });
    }

    const statusLabel = STATUS_LABELS[newStatus] || newStatus;
    const productLabel = PRODUCT_LABELS[productType] || productType || 'Prodotto';
    const priceText = estimatedPrice ? `€${Number(estimatedPrice).toLocaleString('it-IT')}` : null;
    const deliveryText = estimatedDelivery
      ? new Date(estimatedDelivery).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f8fc;margin:0;padding:32px">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:28px 32px">
    <p style="color:#f97316;font-size:13px;font-weight:600;margin:0 0 4px">PRATELLI RAPPRESENTANZE</p>
    <h1 style="color:white;font-size:22px;margin:0">Aggiornamento ordine</h1>
  </div>
  <div style="padding:32px">
    <p style="color:#444;margin:0 0 24px">Ciao${toName ? ` <strong>${toName}</strong>` : ''},</p>
    <div style="background:#f0f9ff;border-left:4px solid #f97316;border-radius:8px;padding:20px;margin-bottom:24px">
      <p style="font-size:13px;color:#666;margin:0 0 6px">NUOVO STATO</p>
      <p style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0">✅ ${statusLabel}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;font-size:13px;color:#888">Prodotto</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${productLabel}</td>
      </tr>
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;font-size:13px;color:#888">Cliente finale</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${clientName || '—'}</td>
      </tr>
      ${priceText ? `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;font-size:13px;color:#888">Importo preventivo</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#f97316;text-align:right">${priceText}</td>
      </tr>` : ''}
      ${deliveryText ? `<tr>
        <td style="padding:10px 0;font-size:13px;color:#888">Consegna stimata</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${deliveryText}</td>
      </tr>` : ''}
    </table>
    ${notes ? `<div style="background:#fafafa;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="font-size:12px;color:#888;margin:0 0 6px">NOTE</p>
      <p style="font-size:14px;color:#444;margin:0">${notes}</p>
    </div>` : ''}
    <p style="font-size:13px;color:#888;margin:0">Per qualsiasi domanda contatta il tuo agente di riferimento.</p>
  </div>
  <div style="background:#f8f8fc;padding:20px 32px;text-align:center">
    <p style="font-size:11px;color:#aaa;margin:0">Pratelli Rappresentanze SRL — Email automatica, non rispondere</p>
  </div>
</div>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toEmail,
        subject: `[Pratelli] ${statusLabel} — ${productLabel}`,
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
