import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const FROM_EMAIL = '2002lavoro@gmail.com';
const FROM_NAME = 'Pratelli Rappresentanze';

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

// ─── Template: aggiornamento stato ordine ─────────────────────────────────────
function buildStatusUpdateHtml(params: {
  toName: string; statusLabel: string; productLabel: string;
  clientName: string; priceText: string | null; deliveryText: string | null; notes: string | null;
}): { subject: string; html: string } {
  const { toName, statusLabel, productLabel, clientName, priceText, deliveryText, notes } = params;

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

  return {
    subject: `[Pratelli] ${statusLabel} — ${productLabel}`,
    html,
  };
}

// ─── Template: promemoria consegna ────────────────────────────────────────────
function buildDeliveryReminderHtml(params: {
  toName: string; productLabel: string; clientName: string;
  deliveryText: string; daysLeft: number; priceText: string | null;
}): { subject: string; html: string } {
  const { toName, productLabel, clientName, deliveryText, daysLeft, priceText } = params;

  const urgencyColor = daysLeft <= 3 ? '#ef4444' : '#f97316';
  const urgencyLabel = daysLeft <= 3
    ? `⚠️ Mancano solo ${daysLeft} giorn${daysLeft === 1 ? 'o' : 'i'}!`
    : `📦 Consegna tra ${daysLeft} giorni`;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f8fc;margin:0;padding:32px">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:28px 32px">
    <p style="color:#f97316;font-size:13px;font-weight:600;margin:0 0 4px">PRATELLI RAPPRESENTANZE</p>
    <h1 style="color:white;font-size:22px;margin:0">📦 Promemoria consegna</h1>
  </div>
  <div style="padding:32px">
    <p style="color:#444;margin:0 0 24px">Ciao${toName ? ` <strong>${toName}</strong>` : ''},</p>
    <div style="background:#fff7ed;border-left:4px solid ${urgencyColor};border-radius:8px;padding:20px;margin-bottom:24px">
      <p style="font-size:13px;color:#666;margin:0 0 6px">CONSEGNA PREVISTA</p>
      <p style="font-size:20px;font-weight:700;color:${urgencyColor};margin:0 0 4px">${urgencyLabel}</p>
      <p style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0">${deliveryText}</p>
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
      ${priceText ? `<tr>
        <td style="padding:10px 0;font-size:13px;color:#888">Importo</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#f97316;text-align:right">${priceText}</td>
      </tr>` : ''}
    </table>
    <p style="font-size:13px;color:#888;margin:0">Assicurati di aver organizzato la consegna e che il cliente sia disponibile.</p>
  </div>
  <div style="background:#f8f8fc;padding:20px 32px;text-align:center">
    <p style="font-size:11px;color:#aaa;margin:0">Pratelli Rappresentanze SRL — Promemoria automatico</p>
  </div>
</div>
</body></html>`;

  return {
    subject: `[Pratelli] 📦 Consegna tra ${daysLeft} giorni — ${clientName || productLabel}`,
    html,
  };
}

// ─── Template: sollecito pagamento ────────────────────────────────────────────
function buildPaymentOverdueHtml(params: {
  toName: string; productLabel: string; clientName: string;
  priceText: string | null; amountPaid: number | null; daysOverdue: number;
}): { subject: string; html: string } {
  const { toName, productLabel, clientName, priceText, amountPaid, daysOverdue } = params;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f8fc;margin:0;padding:32px">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:28px 32px">
    <p style="color:#f97316;font-size:13px;font-weight:600;margin:0 0 4px">PRATELLI RAPPRESENTANZE</p>
    <h1 style="color:white;font-size:22px;margin:0">⚠️ Sollecito pagamento</h1>
  </div>
  <div style="padding:32px">
    <p style="color:#444;margin:0 0 24px">Ciao${toName ? ` <strong>${toName}</strong>` : ''},</p>
    <div style="background:#fff1f2;border-left:4px solid #ef4444;border-radius:8px;padding:20px;margin-bottom:24px">
      <p style="font-size:13px;color:#666;margin:0 0 6px">PAGAMENTO IN RITARDO</p>
      <p style="font-size:18px;font-weight:700;color:#ef4444;margin:0">⏰ ${daysOverdue} giorni di ritardo</p>
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
        <td style="padding:10px 0;font-size:13px;color:#888">Importo totale</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#f97316;text-align:right">${priceText}</td>
      </tr>` : ''}
      ${amountPaid != null && amountPaid > 0 ? `<tr>
        <td style="padding:10px 0;font-size:13px;color:#888">Già pagato</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#10b981;text-align:right">€${amountPaid.toLocaleString('it-IT')}</td>
      </tr>` : ''}
    </table>
    <p style="font-size:13px;color:#888;margin:0">Contatta il cliente per regolarizzare il pagamento. Per assistenza, rispondi a questa email.</p>
  </div>
  <div style="background:#f8f8fc;padding:20px 32px;text-align:center">
    <p style="font-size:11px;color:#aaa;margin:0">Pratelli Rappresentanze SRL — Promemoria automatico</p>
  </div>
</div>
</body></html>`;

  return {
    subject: `[Pratelli] ⚠️ Sollecito pagamento — ${clientName || productLabel} (${daysOverdue}gg)`,
    html,
  };
}

// ─── Template: conferma ordine ────────────────────────────────────────────────
function buildOrderConfirmationHtml(params: {
  toName: string; productLabel: string; clientName: string;
  priceText: string | null; deliveryText: string | null; notes: string | null;
}): { subject: string; html: string } {
  const { toName, productLabel, clientName, priceText, deliveryText, notes } = params;

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f8fc;margin:0;padding:32px">
<div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
  <div style="background:#1a1a2e;padding:28px 32px">
    <p style="color:#f97316;font-size:13px;font-weight:600;margin:0 0 4px">PRATELLI RAPPRESENTANZE</p>
    <h1 style="color:white;font-size:22px;margin:0">🎉 Ordine confermato!</h1>
  </div>
  <div style="padding:32px">
    <p style="color:#444;margin:0 0 24px">Ciao${toName ? ` <strong>${toName}</strong>` : ''},</p>
    <div style="background:#f0fdf4;border-left:4px solid #10b981;border-radius:8px;padding:20px;margin-bottom:24px">
      <p style="font-size:16px;font-weight:600;color:#065f46;margin:0">Il tuo ordine è stato confermato e messo in lavorazione.</p>
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
        <td style="padding:10px 0;font-size:13px;color:#888">Importo</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#f97316;text-align:right">${priceText}</td>
      </tr>` : ''}
      ${deliveryText ? `<tr>
        <td style="padding:10px 0;font-size:13px;color:#888">Consegna prevista</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">📅 ${deliveryText}</td>
      </tr>` : ''}
    </table>
    ${notes ? `<div style="background:#fafafa;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="font-size:12px;color:#888;margin:0 0 6px">NOTE</p>
      <p style="font-size:14px;color:#444;margin:0">${notes}</p>
    </div>` : ''}
    <p style="font-size:13px;color:#888;margin:0">Ti aggiorneremo passo per passo sull'avanzamento del tuo ordine.</p>
  </div>
  <div style="background:#f8f8fc;padding:20px 32px;text-align:center">
    <p style="font-size:11px;color:#aaa;margin:0">Pratelli Rappresentanze SRL — Email automatica, non rispondere</p>
  </div>
</div>
</body></html>`;

  return {
    subject: `[Pratelli] 🎉 Ordine confermato — ${productLabel} per ${clientName || '—'}`,
    html,
  };
}

// ─── Entrypoint ───────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json();
    const {
      toEmail, toName = '',
      emailType = 'status_update',
      // status_update params
      newStatus,
      // shared params
      productType, clientName, estimatedPrice, estimatedDelivery, notes,
      // delivery_reminder specific
      daysLeft,
      // payment_overdue specific
      amountPaid, daysOverdue,
    } = body;

    if (!toEmail) {
      return new Response(JSON.stringify({ error: 'toEmail obbligatorio' }), { status: 400, headers: CORS });
    }

    const statusLabel = STATUS_LABELS[newStatus] || newStatus || '';
    const productLabel = PRODUCT_LABELS[productType] || productType || 'Prodotto';
    const priceText = estimatedPrice
      ? `€${Number(estimatedPrice).toLocaleString('it-IT')}`
      : null;
    const deliveryText = estimatedDelivery
      ? new Date(estimatedDelivery).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    let subject: string;
    let htmlContent: string;

    if (emailType === 'delivery_reminder') {
      if (!estimatedDelivery || daysLeft == null) {
        return new Response(JSON.stringify({ error: 'estimatedDelivery e daysLeft richiesti per delivery_reminder' }), { status: 400, headers: CORS });
      }
      const tpl = buildDeliveryReminderHtml({
        toName, productLabel, clientName: clientName || '—',
        deliveryText: deliveryText!, daysLeft, priceText,
      });
      subject = tpl.subject; htmlContent = tpl.html;

    } else if (emailType === 'payment_overdue') {
      const tpl = buildPaymentOverdueHtml({
        toName, productLabel, clientName: clientName || '—',
        priceText, amountPaid: amountPaid ?? null, daysOverdue: daysOverdue ?? 0,
      });
      subject = tpl.subject; htmlContent = tpl.html;

    } else if (emailType === 'order_confirmation') {
      const tpl = buildOrderConfirmationHtml({
        toName, productLabel, clientName: clientName || '—',
        priceText, deliveryText, notes: notes ?? null,
      });
      subject = tpl.subject; htmlContent = tpl.html;

    } else {
      // default: status_update
      if (!newStatus) {
        return new Response(JSON.stringify({ error: 'newStatus obbligatorio per status_update' }), { status: 400, headers: CORS });
      }
      const tpl = buildStatusUpdateHtml({
        toName, statusLabel, productLabel, clientName: clientName || '—',
        priceText, deliveryText, notes: notes ?? null,
      });
      subject = tpl.subject; htmlContent = tpl.html;
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: toEmail, name: toName || '' }],
        subject,
        htmlContent,
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
