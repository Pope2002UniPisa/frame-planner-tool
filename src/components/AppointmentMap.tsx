import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by Vite bundling
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

function makeIcon(color: string) {
  return L.divIcon({
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function AppointmentMap({ appointments }: { appointments: ApptMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const depKey = appointments.map(a => a.id).join(',');

  useEffect(() => {
    if (!appointments.length || !containerRef.current) return;

    let cancelled = false;
    setStatus('loading');

    // Clean up previous map instance
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

      for (const appt of appointments) {
        if (cancelled) break;
        const coords = await nominatimGeocode(appt.location);
        if (cancelled) break;

        if (coords) {
          L.marker(coords, { icon: makeIcon(appt.color || '#f59e0b') })
            .addTo(map)
            .bindPopup(
              `<strong>${appt.title}</strong>${appt.time ? `<br>🕐 ${appt.time}` : ''}<br>📍 ${appt.location}`
            );
          points.push(coords);
        }
        await new Promise(r => setTimeout(r, 1200));
      }

      if (!cancelled && points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 13 });
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
      {status === 'loading' && (
        <div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur">
          Geocoding indirizzi…
        </div>
      )}
    </div>
  );
}
