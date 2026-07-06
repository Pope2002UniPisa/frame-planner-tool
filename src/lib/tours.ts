// Definizione dei tour guidati (product tour / FAQ interattivo).
// Ogni tour ha un id, il percorso della pagina su cui gira, e i passi.
// I passi con `element` puntano a un attributo data-tour="..."; quelli senza
// element vengono mostrati come nuvoletta centrale (intro/panoramica).

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

  dashboard: {
    id: 'dashboard',
    path: '/dashboard',
    label: 'Come funziona la Dashboard',
    steps: [
      { title: 'La Dashboard', description: 'È la tua panoramica quotidiana: ordini attivi, consegne della settimana, preventivi in attesa e fatturato del mese.' },
      { title: 'Andamento ordini', description: 'Il grafico mostra gli ordini per stato nelle ultime 12 settimane, così vedi a colpo d’occhio come sta andando.' },
      { title: 'Giro di oggi e calendario', description: 'A destra trovi il giro del giorno (con mappa e WhatsApp) e il calendario appuntamenti.' },
      { title: 'Menu laterale', description: 'Da sinistra raggiungi tutte le sezioni: Lead, Clienti, Mappa, Tempi e — se abilitata — la Contabilità.' },
    ],
  },

  clienti: {
    id: 'clienti',
    path: '/dashboard/clienti',
    label: 'Come funzionano i Clienti',
    steps: [
      { title: 'I Clienti', description: 'Qui trovi l’anagrafica dei clienti finali, con i loro dati, i documenti e le misurazioni collegate.' },
      { title: 'Filtri e ricerca', description: 'Cerca un cliente per nome e filtra per stato, prodotto, pagamento o periodo.' },
      { title: 'Scheda cliente', description: 'Aprendo un cliente puoi modificarne i dati, caricare documenti (contratti, foto cantiere) e vedere le misurazioni collegate.' },
    ],
  },

  mappa: {
    id: 'mappa',
    path: '/dashboard/mappa',
    label: 'Come funziona la Mappa',
    steps: [
      { title: 'La Mappa territoriale', description: 'Vedi clienti, lead, preventivi e ordini geolocalizzati sul territorio.' },
      { element: '[data-tour="map-controls"]', title: 'Filtri e ricalcolo', description: 'Accendi/spegni i tipi da mostrare. “Ricalcola posizioni” rigeocoda gli indirizzi per rendere i punti più precisi.' },
      { element: '[data-tour="map-canvas"]', title: 'La mappa', description: 'Ogni pallino è un’entità, colorata per tipo. Clicca un punto per vederne i dettagli.' },
      { element: '[data-tour="map-zones"]', title: 'Conversione per zona', description: 'La tabella aggrega per comune i lead, i vinti, il tasso di conversione e il transato.' },
    ],
  },

  tempi: {
    id: 'tempi',
    path: '/dashboard/tempi',
    label: 'Come funzionano i Tempi',
    steps: [
      { title: 'I Tempi operativi', description: 'Qui misuri quanto tempo passa tra le fasi di lavorazione — il tuo ROI reale, non stimato.' },
      { element: '[data-tour="tempi-kpi"]', title: 'Le mediane chiave', description: 'Tempo mediano per arrivare a preventivo, a ordine e a completamento.' },
      { element: '[data-tour="tempi-table"]', title: 'Dettaglio per transizione', description: 'Per ogni passaggio di stato vedi quante volte è avvenuto, la mediana e la media.' },
    ],
  },

  contabilita: {
    id: 'contabilita',
    path: '/contabilita',
    label: 'Come funziona la Contabilità',
    steps: [
      { title: 'La Contabilità', description: 'Il tuo back-office contabile: fatture, partita doppia, IVA e bilancio, tutto nel portale.' },
      { title: 'Importa le fatture', description: 'Nella scheda “Importa” carichi gli XML FatturaPA: il portale li registra in partita doppia (gestisce anche il reverse charge intra-UE).' },
      { title: 'Giornale, IVA, Bilancio', description: 'Dalle schede vedi il libro giornale (con export CSV), il prospetto IVA per periodo, lo scadenzario, i cespiti e il bilancio SP/CE.' },
    ],
  },

  preventivo: {
    id: 'preventivo',
    path: '/preventivo/nuovo',
    label: 'Come funziona il Preventivo',
    steps: [
      { title: 'Il preventivo a valle', description: 'Componi il prezzo al cliente partendo dal netto d’acquisto: aggiungi ricarico, posa e trasporto.' },
      { title: 'IVA agevolata e detrazioni', description: 'Attiva l’IVA agevolata (split 10/22 sui beni significativi) e scegli una detrazione: vedrai il “prezzo al netto del bonus”.' },
      { title: 'Salva e stampa', description: 'Salvi il preventivo e lo stampi in PDF con il dettaglio dell’IVA e del bonus.' },
    ],
  },
};

export const listTours = () => Object.values(TOURS);
