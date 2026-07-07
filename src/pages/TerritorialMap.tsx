import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw } from 'lucide-react';
import { formatEuro } from '@/lib/format';
import { geocodeAddress, buildAddress } from '@/lib/geocode';

type EntityType = 'cliente' | 'lead' | 'preventivo' | 'ordine';

const TYPE_META: Record<EntityType, { label: string; color: string }> = {
  cliente:    { label: 'Clienti',    color: '#10b981' },
  lead:       { label: 'Lead',       color: '#3b82f6' },
  preventivo: { label: 'Preventivi', color: '#f59e0b' },
  ordine:     { label: 'Ordini',     color: '#8b5cf6' },
};

interface MapEntity {
  id: string;
  type: EntityType;
  title: string;
  subtitle: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  value: number;         // transato/valore stimato per aggregazione
  won?: boolean;         // per i lead
  converted?: boolean;   // lead già convertito in cliente (non mostrare il marker)
}

const dot = (color: string) => L.divIcon({
  html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  className: '', iconSize: [16, 16], iconAnchor: [8, 8],
});

const isPreventivo = (s: string) => ['quoted', 'quote_accepted', 'quote_modifications'].includes(s);
const isOrdine = (s: string) => ['ordered', 'in_production', 'delivering', 'completed'].includes(s);

export default function TerritorialMap() {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const [entities, setEntities] = useState<MapEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<Record<EntityType, boolean>>({ cliente: true, lead: true, preventivo: true, ordine: true });
  const [geocoding, setGeocoding] = useState(0);
  const [recalc, setRecalc] = useState(0);

  // ── Carica clienti, lead, misurazioni ──
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [clients, leads, measurements] = await Promise.all([
        supabase.from('end_clients').select('id,name,address,city,lat,lng').eq('dealer_id', user.id),
        supabase.from('leads').select('id,name,address,city,lat,lng,status,estimated_value,converted_client_id').eq('dealer_id', user.id),
        supabase.from('measurements').select('id,client_name,client_address,status,estimated_price,lat,lng').eq('user_id', user.id),
      ]);

      const list: MapEntity[] = [];
      for (const c of clients.data ?? []) {
        list.push({ id: `c-${c.id}`, type: 'cliente', title: c.name, subtitle: buildAddress(c), city: c.city, lat: c.lat, lng: c.lng, value: 0 });
      }
      for (const l of leads.data ?? []) {
        list.push({ id: `l-${l.id}`, type: 'lead', title: l.name, subtitle: buildAddress(l), city: l.city, lat: l.lat, lng: l.lng, value: Number(l.estimated_value ?? 0), won: l.status === 'vinto', converted: !!l.converted_client_id });
      }
      for (const m of measurements.data ?? []) {
        const status = m.status ?? '';
        if (!isPreventivo(status) && !isOrdine(status)) continue;
        const type: EntityType = isOrdine(status) ? 'ordine' : 'preventivo';
        const city = (m.client_address ?? '').split(',').pop()?.trim() || null;
        list.push({ id: `m-${m.id}`, type, title: m.client_name || 'Misurazione', subtitle: m.client_address ?? '', city, lat: m.lat, lng: m.lng, value: Number(m.estimated_price ?? 0) });
      }
      setEntities(list);
      setLoading(false);
    };
    load();
  }, [user]);

  // ── Geocoding (throttled, persistito). Normalmente solo i mancanti; con
  //    "Ricalcola" (recalc>0) rifà TUTTI gli indirizzi anche se già geocodati. ──
  useEffect(() => {
    if (loading || !user) return;
    const target = recalc > 0
      ? entities.filter(e => e.subtitle)
      : entities.filter(e => (e.lat == null || e.lng == null) && e.subtitle);
    if (target.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const e of target) {
        if (cancelled) break;
        setGeocoding(g => g + 1);
        const coords = await geocodeAddress(e.subtitle, e.city);
        if (coords && !cancelled) {
          const [lat, lng] = coords;
          const [prefix, realId] = e.id.split(/-(.+)/);
          const patch = { lat, lng, geocoded_at: new Date().toISOString() };
          // .from() con nome tabella dinamico non è tipizzabile: smistiamo esplicitamente.
          if (prefix === 'c') await supabase.from('end_clients').update(patch).eq('id', realId);
          else if (prefix === 'l') await supabase.from('leads').update(patch).eq('id', realId);
          else await supabase.from('measurements').update(patch).eq('id', realId);
          setEntities(prev => prev.map(x => x.id === e.id ? { ...x, lat, lng } : x));
        }
        setGeocoding(g => Math.max(0, g - 1));
        await new Promise(r => setTimeout(r, 1200)); // rispetta il rate limit Nominatim
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, recalc]);

  // ── Init mappa (una volta) ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([43.7, 10.5], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      maxZoom: 18, crossOrigin: 'anonymous',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Aggiorna markers su cambi entità/filtri ──
  useEffect(() => {
    const layer = layerRef.current, map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    const pts: [number, number][] = [];
    for (const e of entities) {
      if (!enabled[e.type] || e.lat == null || e.lng == null) continue;
      // Un lead convertito è già mostrato come cliente: non disegnare il doppione lead.
      if (e.type === 'lead' && e.converted) continue;
      pts.push([e.lat, e.lng]);
      L.marker([e.lat, e.lng], { icon: dot(TYPE_META[e.type].color) })
        .addTo(layer)
        .bindPopup(`<strong>${e.title}</strong><br><span style="color:#888">${TYPE_META[e.type].label}</span>${e.subtitle ? `<br>📍 ${e.subtitle}` : ''}${e.value > 0 ? `<br>${formatEuro(e.value)}` : ''}`);
    }
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 13 });
    setTimeout(() => map.invalidateSize({ animate: false }), 100);
  }, [entities, enabled]);

  // ── Conversione per zona (comune) ──
  const zones = useMemo(() => {
    const byCity = new Map<string, { leads: number; won: number; transato: number }>();
    for (const e of entities) {
      const city = (e.city || '—').trim() || '—';
      const z = byCity.get(city) ?? { leads: 0, won: 0, transato: 0 };
      if (e.type === 'lead') { z.leads += 1; if (e.won) z.won += 1; }
      if (e.type === 'ordine') z.transato += e.value;
      byCity.set(city, z);
    }
    return [...byCity.entries()]
      .map(([city, z]) => ({ city, ...z, conv: z.leads > 0 ? Math.round((z.won / z.leads) * 100) : null }))
      .filter(z => z.city !== '—' || z.transato > 0 || z.leads > 0)
      .sort((a, b) => b.transato - a.transato);
  }, [entities]);

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold font-heading text-foreground">Mappa territoriale</h1>
            <p className="text-sm text-muted-foreground">Clienti, lead e ordini geolocalizzati — conversione per zona.</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap" data-tour="map-controls">
            {(Object.keys(TYPE_META) as EntityType[]).map(t => (
              <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox checked={enabled[t]} onCheckedChange={v => setEnabled(prev => ({ ...prev, [t]: !!v }))} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_META[t].color }} />
                {TYPE_META[t].label}
              </label>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRecalc(n => n + 1)} disabled={geocoding > 0}>
              <RefreshCw className={`h-4 w-4 ${geocoding > 0 ? 'animate-spin' : ''}`} /> Ricalcola posizioni
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="relative" data-tour="map-canvas">
              <div ref={containerRef} style={{ height: 480 }} className="w-full rounded-lg overflow-hidden" />
              {geocoding > 0 && (
                <div className="absolute bottom-2 left-2 z-[500] rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
                  Geocoding indirizzi…
                </div>
              )}
              {loading && <div className="absolute inset-0 flex items-center justify-center bg-background/50">Caricamento…</div>}
            </div>
          </CardContent>
        </Card>

        <Card data-tour="map-zones">
          <CardHeader><CardTitle className="font-heading text-base">Conversione per zona</CardTitle></CardHeader>
          <CardContent>
            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun dato per zona.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comune</TableHead>
                    <TableHead className="text-right">Lead</TableHead>
                    <TableHead className="text-right">Vinti</TableHead>
                    <TableHead className="text-right">Conversione</TableHead>
                    <TableHead className="text-right">Transato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map(z => (
                    <TableRow key={z.city}>
                      <TableCell className="font-medium">{z.city}</TableCell>
                      <TableCell className="text-right">{z.leads}</TableCell>
                      <TableCell className="text-right">{z.won}</TableCell>
                      <TableCell className="text-right">{z.conv != null ? `${z.conv}%` : '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-accent">{z.transato > 0 ? formatEuro(z.transato) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
