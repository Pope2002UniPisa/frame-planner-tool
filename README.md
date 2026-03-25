# Welcome to your Lovable project

TODO: 
- npm install
- npm run dev (avvia il server local di sviluppo, in questo caso avviato da VITE v5.4.19)

http://localhost:8080/ (Questo è l’indirizzo che uso sul mio stesso Mac. Aprendolo nel browser, vedo il sito che stai modificando da VSC. Questa è la preview locale. È il posto principale dove controllare tutte le modifiche)
http://192.168.1.34:8080/ (Questo è lo stesso progetto, ma esposto nella tua rete locale. Serve se vuoi aprirlo da: altro computer collegato alla stessa Wi-Fi; iPad; telefono. Per esempio, se vuoi vedere da iPhone come si comporta il sito)

Quindi:
localhost = solo sul tuo Mac
192.168... = visibile anche da altri dispositivi nella stessa rete

Come funziona:
- apri un file in src
- modifichi il codice
- salvi
- vai sul browser aperto su localhost:8080
- il sito si aggiorna quasi in tempo reale
(Questo si chiama hot reload o aggiornamento automatico in sviluppo)

Per lavorare:
- apri VSC
- apri la cartella del progetto
- terminale: npm run dev
- apri nel browser: http://localhost:8080/
- modifica i file
- salva
- guarda il risultato

La parte delle “15 vulnerabilities” che avevi ripreso dalla mia spiegazione Quella scritta significa che alcune librerie installate dal progetto hanno avvisi di sicurezza noti. Non significa automaticamente che il sito sia rotto, né che il progetto non possa partire. In questa fase, la priorità è far funzionare ambiente locale e preview; solo dopo ha senso valutare se aggiornare dipendenze o usare npm audit fix. Gli avvisi possono essere anche in dipendenze indirette e non bloccano per forza lo sviluppo locale.

Dopo il push:
- GitHub si aggiorna
- Lovable dovrebbe sincronizzarsi col repository
- se vuoi aggiornare il sito live, fai anche Publish / Update in Lovable.

1) Cosa significa quello che appare nel terminale

Quelle righe tipo:
[vite] hmr update /src/pages/Profile.tsx, /src/index.css
vogliono dire:
Vite ha rilevato che hai salvato un file
ha aggiornato l’app senza riavviare tutto
ha ricaricato solo la parte necessaria della pagina
hmr cosa vuol dire
hmr = Hot Module Replacement
In pratica:
modifichi il file
salvi
il browser si aggiorna quasi subito
non devi rilanciare npm run dev
Quindi quello che vedi è un segnale buono, non un errore.
Flusso da accettazione preventivo ad accettazione ordine:
2) Il flusso corretto che ti consiglio
Tu vuoi ottenere questo:
Stato 1
Preventivo
badge blu
pulsanti:
Accetta preventivo
Richiedi modifiche
Stato 2
Ordine
badge verde
pallino successivo attivo
i pulsanti cambiano:
Accetta ordine
eventualmente Richiedi modifiche ordine, oppure niente per ora
Stato 3
Ordine firmato
si genera il PDF ordine
viene applicata la firma caricata per il cliente
salvi il PDF firmato
più avanti lo manderai in produzione
Quindi, tecnicamente, ti serve uno stato intermedio. (order_pending_signature)

Ti consiglio questa sequenza:
bozza
submitted
quoted
order_pending_signature
ordered
in_production
delivered
completed