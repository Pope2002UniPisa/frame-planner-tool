import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatEuro } from '@/lib/format';
import { scritturaFatturaAttiva, verificaQuadratura } from '@/lib/accounting';

interface Company { denominazione: string; piva: string; regime_fiscale: string; nazione: string; codice_sdi: string; indirizzo: string; cap: string; comune: string; provincia: string; }

const esc = (s: string) => (s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!));

export default function FattureAttiveContabilita() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string; piva?: string }[]>([]);
  const [form, setForm] = useState({ cliente: '', clientePiva: '', imponibile: '', aliquota: '22', descrizione: '' });
  const [busy, setBusy] = useState(false);

  // Aliquote IVA ordinarie italiane (niente valori arbitrari tipo 17%).
  const ALIQUOTE = ['4', '5', '10', '22'];

  useEffect(() => {
    if (!user) return;
    supabase.from('company_profile' as any).select('*').eq('dealer_id', user.id).maybeSingle()
      .then(({ data }) => setCompany(data as unknown as Company | null));
    supabase.from('end_clients').select('*').eq('dealer_id', user.id).order('name')
      .then(({ data }) => setClients(((data as any[]) ?? []).map(c => ({ id: c.id, name: c.name, piva: c.piva ?? '' }))));
  }, [user]);

  const imponibile = Number(form.imponibile) || 0;
  const iva = Math.round(imponibile * (Number(form.aliquota) || 0)) / 100;
  const totale = Math.round((imponibile + iva) * 100) / 100;

  const emit = async () => {
    if (!user) return;
    if (!company?.piva) { toast.error('Compila prima i dati azienda in company_profile (P.IVA mancante).'); return; }
    if (!form.cliente || imponibile <= 0) { toast.error('Cliente e imponibile obbligatori'); return; }
    setBusy(true);
    const anno = new Date().getFullYear();

    // Progressivo per anno — atomico (INSERT..ON CONFLICT DO UPDATE RETURNING)
    const { data: numero, error: numErr } = await supabase.rpc('next_invoice_number' as any, { p_anno: anno });
    if (numErr || numero == null) { setBusy(false); toast.error(numErr?.message ?? 'Numerazione non riuscita'); return; }
    const data = new Date().toISOString().slice(0, 10);

    const lines = scritturaFatturaAttiva(imponibile, iva);
    if (!verificaQuadratura(lines).ok) { setBusy(false); toast.error('Scrittura non quadra'); return; }

    const { data: entry, error } = await supabase.from('journal_entries' as any).insert({
      dealer_id: user.id, chiave: `ATTIVA|${company.piva}|${numero}|${data}`, data,
      controparte: form.cliente, numero: String(numero), tipo: 'attiva',
      intra_ue: false, stato: 'registrata',
    }).select('id').single();
    if (error || !entry) { setBusy(false); toast.error(error?.message ?? 'Errore'); return; }
    await supabase.from('journal_lines' as any).insert(lines.map((l, i) => ({ entry_id: (entry as any).id, account_code: l.account_code, descr: l.descr, dare: l.dare, avere: l.avere, sort_order: i })));

    // XML FatturaPA (bozza)
    const xml = buildXml(company, form, { numero, data, imponibile, iva, totale });
    const blob = new Blob([xml], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `IT${company.piva}_${String(numero).padStart(5, '0')}.xml`;
    a.click();

    setBusy(false);
    toast.success(`Fattura n. ${numero} emessa e registrata`);
    setForm({ cliente: '', clientePiva: '', imponibile: '', aliquota: '22', descrizione: '' });
  };

  return (
    <ContabilitaLayout>
      {!company?.piva && (
        <Card className="border-destructive/40"><CardContent className="p-4 text-sm text-muted-foreground">
          Per emettere fatture attive servono i dati azienda (P.IVA, sede) nel record <code>company_profile</code>. Configurali per abilitare l'emissione.
        </CardContent></Card>
      )}
      <Card>
        <CardHeader><CardTitle className="font-heading text-base">Emetti fattura attiva</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Select value={form.cliente} onValueChange={name => {
                const c = clients.find(x => x.name === name);
                setForm(f => ({ ...f, cliente: name, clientePiva: c?.piva || f.clientePiva }));
              }}>
                <SelectTrigger><SelectValue placeholder={clients.length ? 'Scegli un cliente' : 'Nessun cliente in anagrafica'} /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">P.IVA cliente</Label><Input value={form.clientePiva} onChange={e => setForm({ ...form, clientePiva: e.target.value })} /></div>
            <div className="space-y-1"><Label className="text-xs">Imponibile €</Label><Input type="number" value={form.imponibile} onChange={e => setForm({ ...form, imponibile: e.target.value })} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Aliquota IVA %</Label>
              <Select value={form.aliquota} onValueChange={v => setForm(f => ({ ...f, aliquota: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALIQUOTE.map(a => <SelectItem key={a} value={a}>{a}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Descrizione</Label><Input value={form.descrizione} onChange={e => setForm({ ...form, descrizione: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">IVA {formatEuro(iva)}</span>
            <span className="font-semibold">Totale {formatEuro(totale)}</span>
          </div>
          <Button onClick={emit} disabled={busy}>Emetti e registra</Button>
          <p className="text-[11px] text-muted-foreground">Genera un XML FatturaPA di bozza e la scrittura (15 a 80 + 45). Da validare col commercialista prima dell'invio a SdI.</p>
        </CardContent>
      </Card>
    </ContabilitaLayout>
  );
}

function buildXml(c: Company, form: { cliente: string; clientePiva: string; descrizione: string }, d: { numero: number; data: string; imponibile: number; iva: number; totale: number }): string {
  const aliquota = d.imponibile > 0 ? (d.iva / d.imponibile * 100) : 0;
  return `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
  <FatturaElettronicaHeader>
    <DatiTrasmissione><IdTrasmittente><IdPaese>${esc(c.nazione)}</IdPaese><IdCodice>${esc(c.piva)}</IdCodice></IdTrasmittente><ProgressivoInvio>${String(d.numero).padStart(5, '0')}</ProgressivoInvio><FormatoTrasmissione>FPR12</FormatoTrasmissione><CodiceDestinatario>${esc(c.codice_sdi || '0000000')}</CodiceDestinatario></DatiTrasmissione>
    <CedentePrestatore><DatiAnagrafici><IdFiscaleIVA><IdPaese>${esc(c.nazione)}</IdPaese><IdCodice>${esc(c.piva)}</IdCodice></IdFiscaleIVA><Anagrafica><Denominazione>${esc(c.denominazione)}</Denominazione></Anagrafica><RegimeFiscale>${esc(c.regime_fiscale || 'RF01')}</RegimeFiscale></DatiAnagrafici><Sede><Indirizzo>${esc(c.indirizzo)}</Indirizzo><CAP>${esc(c.cap)}</CAP><Comune>${esc(c.comune)}</Comune><Provincia>${esc(c.provincia)}</Provincia><Nazione>${esc(c.nazione)}</Nazione></Sede></CedentePrestatore>
    <CessionarioCommittente><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>${esc(form.clientePiva)}</IdCodice></IdFiscaleIVA><Anagrafica><Denominazione>${esc(form.cliente)}</Denominazione></Anagrafica></DatiAnagrafici></CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali><DatiGeneraliDocumento><TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa><Data>${d.data}</Data><Numero>${d.numero}</Numero><ImportoTotaleDocumento>${d.totale.toFixed(2)}</ImportoTotaleDocumento></DatiGeneraliDocumento></DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee><NumeroLinea>1</NumeroLinea><Descrizione>${esc(form.descrizione || 'Prestazione')}</Descrizione><PrezzoUnitario>${d.imponibile.toFixed(2)}</PrezzoUnitario><PrezzoTotale>${d.imponibile.toFixed(2)}</PrezzoTotale><AliquotaIVA>${aliquota.toFixed(2)}</AliquotaIVA></DettaglioLinee>
      <DatiRiepilogo><AliquotaIVA>${aliquota.toFixed(2)}</AliquotaIVA><ImponibileImporto>${d.imponibile.toFixed(2)}</ImponibileImporto><Imposta>${d.iva.toFixed(2)}</Imposta></DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;
}
