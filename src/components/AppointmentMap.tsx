import { memo, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ApptMarker {
  id: string;
  title: string;
  time: string | null;
  location: string;
  color: string | null;
  lat?: number | null;   // coordinate persistite (se presenti si evita il geocoding)
  lng?: number | null;
}

async function nominatimSearch(q: string): Promise<[number, number] | null> {
  const query = /italia|italy/i.test(q) ? q : `${q}, Italia`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=it&countrycodes=it`;
  const res = await fetch(url, { headers: { 'User-Agent': 'PratelliRappresentanze/1.0' } });
  const data = await res.json();
  return data?.[0] ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
}

async function nominatimGeocode(address: string): Promise<[number, number] | null> {
  try {
    // 1st attempt: full address
    const r1 = await nominatimSearch(address);
    if (r1) return r1;

    // 2nd attempt: remove house number (e.g. "Via Roma 12, Pisa" → "Via Roma, Pisa")
    await new Promise(r => setTimeout(r, 1000));
    const withoutNum = address.replace(/\s+\d+[/\w]*(?=\s*,)/, '').replace(/\s+\d+[/\w]*$/, '');
    if (withoutNum !== address) {
      const r2 = await nominatimSearch(withoutNum);
      if (r2) return r2;
    }

    // 3rd attempt: locality only (after last comma)
    await new Promise(r => setTimeout(r, 1000));
    const parts = address.split(',');
    if (parts.length > 1) {
      const r3 = await nominatimSearch(parts[parts.length - 1].trim());
      if (r3) return r3;
    }
  } catch {}
  return null;
}

async function getOSRMRoute(points: [number, number][]): Promise<[number, number][] | null> {
  try {
    const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    return data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  } catch {
    return null;
  }
}

function makeNumberedIcon(n: number, color: string, highlighted = false) {
  const size = highlighted ? 32 : 24;
  const fontSize = highlighted ? 13 : 11;
  const border = highlighted ? '3px solid white' : '2px solid white';
  const shadow = highlighted
    ? '0 0 0 3px rgba(255,255,255,0.6), 0 3px 10px rgba(0,0,0,.5)'
    : '0 2px 6px rgba(0,0,0,.4)';
  return L.divIcon({
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:${border};box-shadow:${shadow};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${fontSize}px;font-family:system-ui;transition:all .15s">${n}</div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface MarkerEntry {
  marker: L.Marker;
  appt: ApptMarker;
  seq: number;
}

export const AppointmentMap = memo(function AppointmentMap({
  appointments,
  hoveredId,
}: {
  appointments: ApptMarker[];
  hoveredId?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, MarkerEntry>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'routing' | 'done'>('idle');
  const depKey = appointments.map(a => a.id).join(',');

  useEffect(() => {
    if (!appointments.length || !containerRef.current) return;

    let cancelled = false;
    setStatus('loading');
    markersRef.current = {};

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, { zoomControl: true }).setView([43.7, 10.5], 9);
    mapRef.current = map;

    // Tiles — crossOrigin required for iOS Safari to render them
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      maxZoom: 18,
      crossOrigin: 'anonymous',
    }).addTo(map);

    map.attributionControl.setPrefix(
      '<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>'
    );

    // Dialog zoom-in animation (200ms) + rendering lag: fire invalidateSize multiple times
    [200, 400, 800].forEach(ms => {
      setTimeout(() => {
        if (!cancelled && mapRef.current) {
          mapRef.current.invalidateSize({ animate: false });
        }
      }, ms);
    });

    (async () => {
      const points: [number, number][] = [];

      for (let i = 0; i < appointments.length; i++) {
        if (cancelled) break;
        const appt = appointments[i];
        // Usa le coordinate persistite se disponibili → nessuna attesa Nominatim.
        const hasCoords = appt.lat != null && appt.lng != null;
        const coords = hasCoords
          ? [appt.lat as number, appt.lng as number] as [number, number]
          : await nominatimGeocode(appt.location);
        if (cancelled) break;

        if (coords) {
          const seq = points.length + 1;
          points.push(coords);
          const marker = L.marker(coords, { icon: makeNumberedIcon(seq, appt.color || '#f59e0b') })
            .addTo(map)
            .bindPopup(
              `<strong>${seq}. ${appt.title}</strong>${appt.time ? `<br>🕐 ${appt.time}` : ''}<br>📍 ${appt.location}`
            );
          markersRef.current[appt.id] = { marker, appt, seq };
        }

        // Delay solo quando abbiamo davvero interrogato Nominatim.
        if (!hasCoords && i < appointments.length - 1) await new Promise(r => setTimeout(r, 1300));
      }

      if (!cancelled && points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 13 });
      }

      if (!cancelled && points.length >= 2) {
        setStatus('routing');
        const route = await getOSRMRoute(points);
        if (route && !cancelled) {
          L.polyline(route, { color: '#3b82f6', weight: 3, opacity: 0.75, dashArray: '8, 5' }).addTo(map);
        }
      }

      if (!cancelled) setStatus('done');
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

  // Hover highlight effect
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { marker, appt, seq }]) => {
      const isHovered = id === hoveredId;
      marker.setIcon(makeNumberedIcon(seq, appt.color || '#f59e0b', isHovered));
      if (isHovered && mapRef.current) {
        marker.openPopup();
      }
    });
  }, [hoveredId]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (!appointments.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground italic">
        Nessun appuntamento con indirizzo per oggi.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: '200px' }}>
      <div ref={containerRef} className="absolute inset-0 rounded-lg" />
      {(status === 'loading' || status === 'routing') && (
        <div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
          {status === 'routing' ? 'Calcolo itinerario…' : 'Geocoding indirizzi…'}
        </div>
      )}
    </div>
  );
});
