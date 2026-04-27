import { useEffect, useRef, useState } from 'react';
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
}

async function nominatimGeocode(address: string): Promise<[number, number] | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ', Italia')}&format=json&limit=1&accept-language=it`;
    const res = await fetch(url);
    const data = await res.json();
    if (data?.[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
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

function makeNumberedIcon(n: number, color: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;font-family:system-ui">${n}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export function AppointmentMap({ appointments }: { appointments: ApptMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'routing' | 'done'>('idle');
  const depKey = appointments.map(a => a.id).join(',');

  useEffect(() => {
    if (!appointments.length || !containerRef.current) return;

    let cancelled = false;
    setStatus('loading');

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, { zoomControl: true }).setView([43.7, 10.5], 9);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    (async () => {
      const points: [number, number][] = [];

      for (let i = 0; i < appointments.length; i++) {
        if (cancelled) break;
        const appt = appointments[i];
        const coords = await nominatimGeocode(appt.location);
        if (cancelled) break;

        if (coords) {
          const seq = points.length + 1;
          points.push(coords);
          L.marker(coords, { icon: makeNumberedIcon(seq, appt.color || '#f59e0b') })
            .addTo(map)
            .bindPopup(
              `<strong>${seq}. ${appt.title}</strong>${appt.time ? `<br>🕐 ${appt.time}` : ''}<br>📍 ${appt.location}`
            );
        }

        if (i < appointments.length - 1) await new Promise(r => setTimeout(r, 1200));
      }

      if (!cancelled && points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 13 });
      }

      if (!cancelled && points.length >= 2) {
        setStatus('routing');
        const route = await getOSRMRoute(points);
        if (route && !cancelled) {
          L.polyline(route, {
            color: '#3b82f6',
            weight: 3,
            opacity: 0.75,
            dashArray: '8, 5',
          }).addTo(map);
        }
      }

      if (!cancelled) setStatus('done');
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey]);

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
    <div className="relative h-full">
      <div ref={containerRef} className="h-full w-full rounded-lg" style={{ minHeight: '180px' }} />
      {(status === 'loading' || status === 'routing') && (
        <div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
          {status === 'routing' ? 'Calcolo itinerario…' : 'Geocoding indirizzi…'}
        </div>
      )}
    </div>
  );
}
