import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/tour.css';
import { TOURS } from '@/lib/tours';

// Avvia un tour da qualsiasi punto dell'app (es. da Silvia o da un pulsante "Guida").
// eslint-disable-next-line react-refresh/only-export-components
export function startTour(id: string) {
  window.dispatchEvent(new CustomEvent('mm:start-tour', { detail: id }));
}

function runTour(id: string) {
  const t = TOURS[id];
  if (!t) return;
  // Tiene solo i passi il cui elemento esiste (i passi senza elemento restano).
  const steps = t.steps
    .filter(s => !s.element || document.querySelector(s.element))
    .map(s => ({ element: s.element, popover: { title: s.title, description: s.description } }));
  if (!steps.length) return;
  const d = driver({
    showProgress: true,
    allowClose: true,
    nextBtnText: 'Avanti',
    prevBtnText: 'Indietro',
    doneBtnText: 'Fine',
    progressText: '{{current}} di {{total}}',
    steps,
  });
  d.drive();
}

// Aspetta che la pagina di destinazione abbia montato gli elementi, poi avvia.
function runWhenReady(id: string) {
  const t = TOURS[id];
  if (!t) return;
  const firstWithElement = t.steps.find(s => s.element);
  let tries = 0;
  const tick = () => {
    tries++;
    const ready = !firstWithElement || document.querySelector(firstWithElement.element!);
    if (ready) { runTour(id); return; }
    if (tries < 20) setTimeout(tick, 200); // fino a ~4s
    else runTour(id); // avvia comunque (mostrerà i passi centrali disponibili)
  };
  tick();
}

export default function TourController() {
  const navigate = useNavigate();
  const location = useLocation();
  const pending = useRef<string | null>(null);

  useEffect(() => {
    const onStart = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const t = TOURS[id];
      if (!t) return;
      if (location.pathname === t.path) {
        runWhenReady(id);
      } else {
        pending.current = id;
        navigate(t.path);
      }
    };
    window.addEventListener('mm:start-tour', onStart);
    return () => window.removeEventListener('mm:start-tour', onStart);
  }, [location.pathname, navigate]);

  // Quando arriviamo sulla pagina giusta, avvia il tour in attesa.
  useEffect(() => {
    if (pending.current && TOURS[pending.current]?.path === location.pathname) {
      const id = pending.current;
      pending.current = null;
      runWhenReady(id);
    }
  }, [location.pathname]);

  return null;
}
