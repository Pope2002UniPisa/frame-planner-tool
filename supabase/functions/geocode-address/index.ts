import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Geocoding server-side via Nominatim (OpenStreetMap), gratuito e senza chiavi.
// Strategia per massimizzare la precisione:
//  1) ricerca STRUTTURATA (street=via+civico, city=comune, country=Italia) — la più accurata
//  2) testo libero completo + ", Italia"
//  3) testo libero via + comune + ", Italia"
//  4) ultima spiaggia: centro del comune (meno preciso)
// Ritorna { lat, lng, precision } dove precision indica quanto è affidabile il punto.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'PratelliRappresentanze/1.0 (portale geocoding)';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

type Hit = { lat: number; lng: number } | null;

async function nominatim(params: Record<string, string>): Promise<Hit> {
  const qs = new URLSearchParams({
    format: 'json', limit: '1', 'accept-language': 'it', countrycodes: 'it', ...params,
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] ? { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } : null;
}

async function geocode(address: string, city?: string): Promise<{ lat: number; lng: number; precision: string } | null> {
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  let town = (city || '').trim();
  let street = address.trim();
  if (!town && parts.length > 1) town = parts[parts.length - 1];
  if (town && parts.length > 1 && parts[parts.length - 1].toLowerCase() === town.toLowerCase()) {
    street = parts.slice(0, parts.length - 1).join(', ');
  }

  // 1) Strutturata (più precisa sui civici)
  const r1 = await nominatim({ street, city: town, country: 'Italia' });
  if (r1) return { ...r1, precision: 'structured' };

  // 2) Testo libero completo
  await sleep(1000);
  const r2 = await nominatim({ q: `${address}, Italia` });
  if (r2) return { ...r2, precision: 'full' };

  // 3) Via + comune
  if (town && street && street !== town) {
    await sleep(1000);
    const r3 = await nominatim({ q: `${street}, ${town}, Italia` });
    if (r3) return { ...r3, precision: 'street' };
  }

  // 4) Centro comune (meno preciso)
  if (town) {
    await sleep(1000);
    const r4 = await nominatim({ q: `${town}, Italia` });
    if (r4) return { ...r4, precision: 'city' };
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { address, city } = await req.json();
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'address mancante' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
    }
    const hit = await geocode(address.trim(), typeof city === 'string' ? city : undefined);
    const body = hit ?? { lat: null, lng: null, precision: 'none' };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', ...CORS } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
});
