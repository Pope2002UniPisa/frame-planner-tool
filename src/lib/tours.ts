// Definizione dei tour guidati (product tour / FAQ interattivo).
// Ogni tour ha un id, il percorso della pagina su cui gira, e i passi.
// I passi con `element` puntano a un attributo data-tour="..."; quelli senza
// element vengono mostrati come nuvoletta centrale (intro/outro).

export interface TourStep {
  element?: string; // selettore CSS, es. '[data-tour="lead-new"]'
  title: string;
  description: string;
}

export interface TourDef {
  id: string;
  path: string;       // dove deve girare il tour
  label: string;      // etichetta per il pulsante "Guida"
  steps: TourStep[];
}

export const TOURS: Record<string, TourDef> = {
  lead: {
    id: 'lead',
    path: '/dashboard/lead',
    label: 'Come funzionano i Lead',
    steps: [
      { title: 'I Lead — il tuo CRM pre-vendita', description: "Qui gestisci ogni contatto prima della vendita: dal primo interesse fino alla chiusura. Ti mostro come funziona." },
      { element: '[data-tour="lead-new"]', title: 'Crea un nuovo lead', description: 'Aggiungi un contatto: nome, telefono, città, fonte (showroom, telefono, passaparola, sito) e un valore stimato.' },
      { element: '[data-tour="lead-pipeline"]', title: 'La pipeline', description: 'Ogni colonna è uno stato: Nuovo → Contattato → Preventivo inviato → In trattativa → Vinto/Perso. Clicca un lead per aprirlo.' },
      { element: '[data-tour="lead-recall"]', title: 'Da richiamare', description: 'I lead con un promemoria scaduto compaiono qui, così non ti dimentichi di richiamare nessuno.' },
      { element: '[data-tour="lead-filters"]', title: 'Cerca e filtra', description: 'Trova rapidamente un lead per nome, città o telefono, oppure filtra per fonte.' },
      { title: 'Converti in cliente', description: "Quando un lead è vinto, aprilo e usa “Converti in cliente”: crea la scheda cliente e lo collega automaticamente." },
    ],
  },
};

export const listTours = () => Object.values(TOURS);
