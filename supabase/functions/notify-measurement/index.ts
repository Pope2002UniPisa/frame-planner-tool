import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = '2002lavoro@gmail.com';
const FROM_NAME = 'Pratelli Rappresentanze';
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

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Nuova richiesta preventivo', ricevuto: 'Nuova richiesta preventivo',
  quoted: 'Preventivo inviato', quote_accepted: 'Preventivo accettato',
  quote_modifications: 'Modifiche preventivo richieste', ordered: 'Ordine confermato',
  in_production: 'In produzione', delivering: 'Pronta per consegna', completed: 'Completata',
};

const SURVEY_LABELS: Record<string, string> = {
  foro_muro: 'Foro muro', luce_netta: 'Luce netta',
  grezzo: 'Grezzo', finito: 'Finito', controtelaio: 'Controtelaio',
};

const COLOR_LABELS: Record<string, string> = {
  bianco: 'Bianco', avorio: 'Avorio', grigio_chiaro: 'Grigio chiaro',
  grigio_antracite: 'Grigio antracite', marrone: 'Marrone', noce: 'Noce',
  verde_scuro: 'Verde scuro', blu_notte: 'Blu notte', rosso_mattone: 'Rosso mattone', nero: 'Nero',
  lo_bianco_optical: 'Laccato Opaco Bianco Optical', lo_bianco: 'Laccato Opaco Bianco',
  lo_grigio_lux: 'Laccato Opaco Grigio Lux', lo_tortora: 'Laccato Opaco Tortora',
  uo_tortora: 'Laccato ULTRA Opaco Tortora', uo_bianco_optical: 'Laccato ULTRA Opaco Bianco Optical',
  uo_bianco: 'Laccato ULTRA Opaco Bianco', uo_grigio_lux: 'Laccato ULTRA Opaco Grigio Lux',
  uo_corallo_light: 'Laccato ULTRA Opaco Corallo Light', uo_corallo_pure: 'Laccato ULTRA Opaco Corallo Pure',
  uo_metallo_light: 'Laccato ULTRA Opaco Metallo Light', uo_metallo_pure: 'Laccato ULTRA Opaco Metallo Pure',
  uo_metallo_dark: 'Laccato ULTRA Opaco Metallo Dark',
  uo_laguna_light: 'Laccato ULTRA Opaco Laguna Light', uo_laguna_pure: 'Laccato ULTRA Opaco Laguna Pure',
  uo_laguna_dark: 'Laccato ULTRA Opaco Laguna Dark',
  uo_lichene_light: 'Laccato ULTRA Opaco Lichene Light', uo_lichene_pure: 'Laccato ULTRA Opaco Lichene Pure',
  uo_terra_light: 'Laccato ULTRA Opaco Terra Light', uo_terra_pure: 'Laccato ULTRA Opaco Terra Pure',
  uo_oliva_light: 'Laccato ULTRA Opaco Oliva Light', uo_oliva_pure: 'Laccato ULTRA Opaco Oliva Pure',
  uo_oliva_dark: 'Laccato ULTRA Opaco Oliva Dark',
  uo_ombra_light: 'Laccato ULTRA Opaco Ombra Light', uo_ombra_pure: 'Laccato ULTRA Opaco Ombra Pure',
  uo_ombra_dark: 'Laccato ULTRA Opaco Ombra Dark',
  uo_malva_light: 'Laccato ULTRA Opaco Malva Light', uo_malva_pure: 'Laccato ULTRA Opaco Malva Pure',
  uo_nero_profondo: 'Laccato ULTRA Opaco Nero Profondo',
};

const FRAME_LABELS: Record<string, string> = {
  pvc: 'PVC', alluminio: 'Alluminio', legno: 'Legno', legno_alluminio: 'Legno/Alluminio',
  evoluto_eleva: 'Evoluto Eleva', minimal_eleva: 'Minimal Eleva', quality_eleva: 'Quality Eleva',
  dorico: 'Dorico', flat: 'Flat', genius_eleva: 'Genius Eleva', oval_eleva: 'Oval Eleva',
  a_filo: 'A Filo', concept: 'Concept',
};

const HANDLE_FINISH_LABELS: Record<string, string> = {
  cromo_satinato: 'Cromo Satinato', cromo_lucido: 'Cromo Lucido',
  bianco_optical: 'Bianco Optical', nero: 'Nero', grigio_alluminio: 'Grigio Alluminio',
  grafite_satinato: 'Grafite Satinato', oro_satinato: 'Oro Satinato',
  ora_antico_lucido: 'Oro Antico Lucido', ottone_lucido: 'Ottone Lucido',
  nikel_lucido: 'Nikel Lucido', bronzo_satinato: 'Bronzo Satinato',
  cromo_lucido_satinato: 'Cromo Lucido + Satinato', cromo_lucido_bianco: 'Cromo Lucido + Bianco Optical',
  cromo_lucido_nero: 'Cromo Lucido + Nero', bianco: 'Bianco',
};

const GLASS_LABELS: Record<string, string> = {
  doppio_vetro: 'Doppio vetro', triplo_vetro: 'Triplo vetro',
  sicurezza: 'Vetro sicurezza', cieca: 'Cieca',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const {
      userId, measurementId, clientName, clientAddress, productType, surveyType,
      dimensions, estimatedPrice, measurement, doorModelName, status,
    } = await req.json();

    const statusLabel = STATUS_LABELS[status || 'submitted'] || 'Nuova richiesta preventivo';
    const productLabel = doorModelName || PRODUCT_LABELS[productType] || productType || 'Prodotto';
    const surveyLabel = SURVEY_LABELS[surveyType] || surveyType || null;
    const priceText = estimatedPrice
      ? `€${Number(estimatedPrice).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
      : null;

    // Recupera il profilo del rivenditore
    let resellerName = '';
    let resellerLogoUrl = '';
    if (userId) {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=company_name,logo_url`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const profiles = await profileRes.json();
      if (profiles?.[0]) {
        resellerName = profiles[0].company_name || '';
        resellerLogoUrl = profiles[0].logo_url || '';
      }
    }

    // Costruisce le righe di dettaglio configurazione
    const installationType = measurement?.installation_type;
    const installationLabel = installationType === 'solo_fornitura' ? 'Solo fornitura'
      : installationType === 'con_installazione' ? 'Con installazione' : null;
    const layingLabel = measurement?.laying_type === 'certificata' ? 'Posa certificata'
      : measurement?.laying_type === 'standard' ? 'Posa standard' : null;

    const detailRows: [string, string][] = [
      measurement?.material && ['Materiale', FRAME_LABELS[measurement.material] || measurement.material],
      measurement?.color_internal && ['Colore interno', COLOR_LABELS[measurement.color_internal] || measurement.color_internal],
      measurement?.color_external && ['Colore esterno', COLOR_LABELS[measurement.color_external] || measurement.color_external],
      measurement?.door_color_name && ['Colore porta', measurement.door_color_name],
      measurement?.frame_type && ['Tipo telaio', FRAME_LABELS[measurement.frame_type] || measurement.frame_type],
      measurement?.glass_type && ['Vetro', GLASS_LABELS[measurement.glass_type] || measurement.glass_type],
      measurement?.handle_type && ['Maniglia', HANDLE_FINISH_LABELS[measurement.handle_type] || measurement.handle_type],
      installationLabel && [installationLabel, layingLabel || ''],
      measurement?.notes && ['Note', measurement.notes],
    ].filter(Boolean) as [string, string][];

    const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f8f8fc;margin:0;padding:32px">
<div style="max-width:580px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

  <div style="background:#1a1a2e;padding:28px 32px">
    <p style="color:#f97316;font-size:13px;font-weight:600;margin:0 0 4px">PRATELLI RAPPRESENTANZE</p>
    <h1 style="color:white;font-size:22px;margin:0">📐 ${statusLabel}</h1>
  </div>

  ${resellerName ? `
  <div style="padding:16px 32px;border-bottom:1px solid #f0f0f0">
    <table style="border-collapse:collapse">
      <tr>
        ${resellerLogoUrl ? `<td style="vertical-align:middle;padding-right:12px"><img src="${resellerLogoUrl}" alt="${resellerName}" style="height:36px;width:36px;object-fit:contain;border-radius:6px;border:1px solid #eee;display:block" /></td>` : ''}
        <td style="vertical-align:middle"><p style="font-size:15px;font-weight:700;color:#1a1a2e;margin:0">${resellerName}</p></td>
      </tr>
    </table>
  </div>` : ''}

  <div style="padding:32px">
    <div style="background:#f0f9ff;border-left:4px solid #f97316;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="font-size:13px;color:#666;margin:0 0 4px">PRODOTTO</p>
      <p style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0">${productLabel}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;font-size:13px;color:#888">Cliente finale</td>
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
      ${surveyLabel ? `<tr style="border-bottom:1px solid #f0f0f0">
        <td style="padding:10px 0;font-size:13px;color:#888">Tipo misurazione</td>
        <td style="padding:10px 0;font-size:13px;font-weight:600;color:#1a1a2e;text-align:right">${surveyLabel}</td>
      </tr>` : ''}
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
        <td style="padding:8px 0;font-size:12px;font-weight:500;color:#1a1a2e;text-align:right">${value || '—'}</td>
      </tr>`).join('')}
    </table>` : ''}
  </div>

  <div style="background:#f8f8fc;padding:20px 32px;text-align:center">
    ${measurementId ? `<a href="https://frame-planner-tool.vercel.app/misurazione/${measurementId}/stampa" style="display:inline-block;background:#f97316;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin-bottom:16px">📄 Apri PDF misurazione</a><br>` : ''}
    <p style="font-size:11px;color:#aaa;margin:0">Pratelli Rappresentanze SRL — Email automatica</p>
  </div>
</div>
</body></html>`;

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: ADMIN_EMAIL, name: 'Admin Pratelli' }],
        subject: `[Pratelli] ${statusLabel} — ${resellerName || 'Cliente'} • ${clientName || ''} • ${productLabel}`,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json', ...CORS } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: CORS });
  }
});
