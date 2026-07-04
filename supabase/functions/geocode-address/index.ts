import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Geocoding server-side via Nominatim (User-Agent unico, niente CORS lato browser).
// Ritorna { lat, lng } | { lat: null }. Il client persiste le coordinate sotto la
// propria RLS — così le coordinate si calcolano UNA volta e la mappa non attende più.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function nominatimSearch(q: string): Promise<[number, number] | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&accept-language=it&countrycodes=it`;
  const res = await fetch(url, { headers: { 'User-Agent': 'PratelliRappresentanze/1.0 (portale)' } });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
}

async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const r1 = await nominatimSearch(address);
    if (r1) return r1;

    await new Promise(r => setTimeout(r, 1000));
    const withoutNum = address.replace(/\s+\d+[/\w]*(?=\s*,)/, '').replace(/\s+\d+[/\w]*$/, '');
    if (withoutNum !== address) {
      const r2 = await nominatimSearch(withoutNum);
      if (r2) return r2;
    }

    await new Promise(r => setTimeout(r, 1000));
    const parts = address.split(',');
    if (parts.length > 1) {
      const r3 = await nominatimSearch(parts[parts.length - 1].trim());
      if (r3) return r3;
    }
  } catch (_) { /* ignore */ }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { address } = await req.json();
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'address mancante' }), { status: 400, headers: { 'Content-Type': 'application/json', ...CORS } });
    }
    const coords = await geocode(address.trim());
    const body = coords ? { lat: coords[0], lng: coords[1] } : { lat: null, lng: null };
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', ...CORS } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } });
  }
});
