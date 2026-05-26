/**
 * send-reminders — Edge Function per promemoria automatici
 *
 * Viene chiamata ogni giorno da GitHub Actions alle 08:00 (Europe/Rome).
 * Invia via Brevo:
 *   1. Promemoria consegna: 7 e 3 giorni prima della data stimata
 *   2. Sollecito pagamento: ordini con payment_status != 'paid' e consegna > 14 gg fa
 *
 * Sicurezza: richiede l'header Authorization: Bearer <CRON_SECRET>
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');
const FROM_EMAIL = '2002lavoro@gmail.com';
const FROM_NAME = 'Pratelli Rappresentanze';
const ADMIN_EMAIL = '2002lavoro@gmail.com';

const PRODUCT_LABELS: Record<string, string> = {
  finestra: 'Finestra', porta_finestra: 'Porta finestra', porta: 'Porta',
  basculante: 'Basculante', zanzariera: 'Zanzariera', persiana: 'Persiana',
  porta_finestrata: 'Porta finestrata', porta_filomuro: 'Porta filomuro',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatItDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
}

async function dbGet(path: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`DB error on ${path}: ${await res.text()}`);
  return res.json();
}

async function sendBrevoEmail(to: string, toName: string, subject: string, html: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    console.error(`Brevo error for ${to}:`, await res.text());
  }
}

// ─── Template promemoria consegna ─────────────────────────────────────────────
function deliveryReminderHtml(params: {
  toName: string; productLabel: string; clientName: string;
  deliveryText: string; daysLeft: number; priceText: string | null;
}): string {
  const { toName, productLabel, clientName, deliveryText, daysLeft, priceText } = params;
  const urgencyColor = daysLeft <= 3 ? '#ef4444' : '#f97316';
  const urgencyLabel = daysLeft <= 3
    ? `⚠️ Mancano solo ${daysLeft} giorn${daysLeft === 1 ? 'o' : 'i'}!`
    : `📦 Consegna tra ${daysLeft} giorni`;

  return `<!DOCTYPE html>
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
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${clientName}</td>
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
}

// ─── Template sollecito pagamento ─────────────────────────────────────────────
function paymentOverdueHtml(params: {
  toName: string; productLabel: string; clientName: string;
  priceText: string | null; amountPaid: number | null; daysOverdue: number;
}): string {
  const { toName, productLabel, clientName, priceText, amountPaid, daysOverdue } = params;

  return `<!DOCTYPE html>
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
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${clientName}</td>
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
    <p style="font-size:13px;color:#888;margin:0">Contatta il tuo rivenditore per regolarizzare il pagamento.</p>
  </div>
  <div style="background:#f8f8fc;padding:20px 32px;text-align:center">
    <p style="font-size:11px;color:#aaa;margin:0">Pratelli Rappresentanze SRL — Promemoria automatico</p>
  </div>
</div>
</body></html>`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Verifica il token segreto del cron job
  if (CRON_SECRET) {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (token !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }
  }

  const results = { deliveryReminders: 0, paymentOverdue: 0, errors: 0 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    // ── 1. Promemoria consegna (3 e 7 giorni prima) ─────────────────────────
    const reminderDays = [3, 7];
    for (const days of reminderDays) {
      const targetDate = toISODate(addDays(today, days));

      // Misurazioni con consegna in esattamente 'days' giorni e non ancora completate
      const measurements = await dbGet(
        `measurements?estimated_delivery_date=eq.${targetDate}` +
        `&status=neq.completed&status=neq.bozza&select=id,product_type,client_name,estimated_price,user_id`
      );

      for (const m of measurements) {
        // Recupera il profilo del rivenditore per avere l'email
        const profiles = await dbGet(`profiles?user_id=eq.${m.user_id}&select=email,company_name`);
        const profile = profiles[0];
        if (!profile?.email) continue;

        const productLabel = PRODUCT_LABELS[m.product_type] || m.product_type || 'Prodotto';
        const priceText = m.estimated_price
          ? `€${Number(m.estimated_price).toLocaleString('it-IT')}`
          : null;
        const deliveryText = formatItDate(targetDate);

        const html = deliveryReminderHtml({
          toName: profile.company_name || '',
          productLabel,
          clientName: m.client_name || '—',
          deliveryText,
          daysLeft: days,
          priceText,
        });

        // Invia al rivenditore
        await sendBrevoEmail(
          profile.email,
          profile.company_name || '',
          `[Pratelli] 📦 Consegna tra ${days} giorni — ${m.client_name || productLabel}`,
          html
        );

        // Copia all'admin (se diverso dal rivenditore)
        if (profile.email !== ADMIN_EMAIL) {
          await sendBrevoEmail(
            ADMIN_EMAIL,
            'Admin Pratelli',
            `[Pratelli] 📦 Consegna tra ${days} giorni — ${m.client_name || productLabel} (${profile.company_name || ''})`,
            html
          );
        }

        results.deliveryReminders++;
      }
    }

    // ── 2. Solleciti pagamento (consegna > 14 gg fa, non pagati) ────────────
    const overdueDate = toISODate(addDays(today, -14));

    const unpaidMeasurements = await dbGet(
      `measurements?estimated_delivery_date=lte.${overdueDate}` +
      `&payment_status=neq.paid&status=in.(delivering,completed)` +
      `&select=id,product_type,client_name,estimated_price,amount_paid,estimated_delivery_date,user_id`
    );

    for (const m of unpaidMeasurements) {
      const profiles = await dbGet(`profiles?user_id=eq.${m.user_id}&select=email,company_name`);
      const profile = profiles[0];
      if (!profile?.email) continue;

      const productLabel = PRODUCT_LABELS[m.product_type] || m.product_type || 'Prodotto';
      const priceText = m.estimated_price
        ? `€${Number(m.estimated_price).toLocaleString('it-IT')}`
        : null;

      const deliveryDate = new Date(m.estimated_delivery_date);
      const daysOverdue = Math.floor((today.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));

      const html = paymentOverdueHtml({
        toName: profile.company_name || '',
        productLabel,
        clientName: m.client_name || '—',
        priceText,
        amountPaid: m.amount_paid ?? null,
        daysOverdue,
      });

      await sendBrevoEmail(
        profile.email,
        profile.company_name || '',
        `[Pratelli] ⚠️ Sollecito pagamento — ${m.client_name || productLabel} (${daysOverdue}gg)`,
        html
      );

      // Copia all'admin
      if (profile.email !== ADMIN_EMAIL) {
        await sendBrevoEmail(
          ADMIN_EMAIL,
          'Admin Pratelli',
          `[Pratelli] ⚠️ Sollecito pagamento — ${m.client_name || productLabel} — ${profile.company_name || ''} (${daysOverdue}gg)`,
          html
        );
      }

      results.paymentOverdue++;
    }

  } catch (e: any) {
    console.error('send-reminders error:', e.message);
    results.errors++;
  }

  console.log('send-reminders completato:', results);
  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
});
