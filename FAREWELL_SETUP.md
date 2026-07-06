# Farewell — Attivazione portale unico

Passi per mettere in produzione il lavoro del branch `feat/farewell-portale-unico`
(CRM lead, tempi/mediane, preventivo a valle, mappa territoriale, contabilità).
Tutti i comandi vanno lanciati dalla cartella del progetto, con la Supabase CLI
già linkata (project ref `pypuvyydttwtbszabrfp`).

> ⚠️ Le migrazioni toccano il DB di produzione. Fai prima un backup/PITR e,
> possibilmente, provale su un progetto di staging.

## 1. Applica le migrazioni
```bash
supabase db push
```
Migrazioni incluse (additive, `IF NOT EXISTS`):
- `20260705100000_add_leads.sql` — leads + lead_activities (RLS dealer)
- `20260705100100_status_timing.sql` — CHECK stati allargata, trigger storico
  stati, operation_events, viste durate/mediane
- `20260705100200_add_quotes.sql` — quotes, quote_lines, vat_rates, detrazioni (+seed)
- `20260705100300_add_geocoding.sql` — lat/lng su end_clients, measurements, appointments
- `20260705100400_add_accounting.sql` — piano conti, coding_rules/keywords,
  invoices_raw, journal_entries/lines, assets, invoice_counters, company_profile,
  viste saldi + funzione IVA, bucket `fatture-xml`

## 2. Storage
Il bucket `fatture-xml` (privato) viene creato dalla migrazione. Verifica in
Dashboard → Storage che esista. (Il bucket `client-documents` era già richiesto.)

## 3. Edge Function geocoding
```bash
supabase functions deploy geocode-address
```
Non richiede secret (usa Nominatim pubblico). Il portale la chiama via
`supabase.functions.invoke('geocode-address', …)`.

## 4. Rigenera i tipi TypeScript (toglie i cast `as any`)
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```
Opzionale ma consigliato: dopo, i nuovi accessi (`leads`, `quotes`, `journal_*`,
viste…) diventano tipizzati. Finché non lo fai, il codice usa i cast `as any`
come già fa il resto del repo.

## 5. Abilita la contabilità a un rivenditore
La sezione Contabilità è gated per abbonamento. Per abilitarla a un dealer:
```sql
update public.profiles set accounting_enabled = true where user_id = '<uuid-dealer>';
```
(Gli admin la vedono sempre.)

## 6. Verifica end-to-end
- Lead: crea un lead → converti in cliente.
- Tempi: cambia stato a una misurazione → compare in `/dashboard/tempi`.
- Preventivo: da una misurazione → "Preventivo dettagliato" → IVA split + bonus → stampa.
- Mappa: `/dashboard/mappa` geolocalizza clienti/lead/ordini (coord persistite).
- Contabilità: `/contabilita/importa` → carica gli XML di
  `contabilita_app/fatture_esempio/` (incluso `RO12345678_001.xml`) → approva →
  in `/contabilita/giornale` il reverse charge quadra e in `/contabilita/iva`
  l'IVA della Romania è a saldo zero.

## Note fiscali
Regime IVA (split beni significativi), reverse charge 22% e detrazioni sono
**parametrici** e vanno **validati col commercialista** prima dell'uso reale
(Master List §13/§17). Le UI lo segnalano.
