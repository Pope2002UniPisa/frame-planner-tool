# Measure Master — Frame Planner Tool

Applicazione web per la gestione di misurazioni, preventivi e ordini di serramenti e infissi.

## Stack tecnico

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend/Auth/DB**: Supabase (PostgreSQL + RLS)
- **Deploy**: Vercel
- **Routing**: React Router v6

## Avvio locale

```bash
npm install
npm run dev
```

Il server parte su `http://localhost:8080/`.  
Sulla stessa rete locale è raggiungibile anche da altri dispositivi (es. iPhone, iPad).

## Struttura del progetto

```
src/
  pages/        # Pagine dell'app (Dashboard, Misurazioni, Profilo, Admin…)
  components/   # Componenti riutilizzabili (shadcn/ui + custom)
  lib/          # Auth context, utils, costanti condivise
  hooks/        # Hook custom (useAuth, useAdminCheck, useMobile)
  data/         # Catalogo prodotti (doorCatalog.ts)
  integrations/ # Client Supabase e tipi generati
```

## Workflow misurazioni

| Stato | Descrizione |
|-------|-------------|
| `bozza` | Creata, non inviata |
| `quoted` | Preventivo emesso |
| `ordered` | Ordine confermato |
| `in_production` | In lavorazione |
| `delivering` | In consegna |
| `completed` | Consegnata e completata |

## Variabili d'ambiente

Crea un file `.env` nella root del progetto (non committare mai questo file):

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
```

Su Vercel le stesse variabili vanno configurate nelle impostazioni del progetto.

## Deploy

- Push su `main` → Vercel aggiorna automaticamente il sito live.
- Il database è su Supabase, separato dal deploy frontend.



Si dovrà poi aggiungere un numero whataspp business verificato per far arrivare le notifiche su whatsapp direttamente dal sito.
3. Configurare le variabili Twilio (quando hai il numero verificato)
→ Supabase → Edge Functions → send-whatsapp → Secrets:


TWILIO_ACCOUNT_SID     = ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN      = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM   = whatsapp:+14155238886
TWILIO_WHATSAPP_TO     = whatsapp:+39XXXXXXXXXX
Finché non metti questi valori, la funzione gira ma salta l'invio WhatsApp senza errori.

Quale evento manda WhatsApp:

Nuovo appuntamento salvato nel calendario
Cliente accetta o chiede modifiche a un preventivo

