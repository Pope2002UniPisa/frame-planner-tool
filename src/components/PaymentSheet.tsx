import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatEuro } from '@/lib/format';
import { Copy, Printer, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface Company { denominazione?: string; iban?: string; }

interface Props {
  /** owner (dealer) della misurazione: chiave del company_profile */
  dealerId: string;
  paymentCode: string | null;
  /** importo totale dovuto (estimated_price = lordo, IVA compresa) */
  totalDue: number;
  amountPaid?: number;
}

/**
 * Foglio pagamento stampabile per l'ordine: importo, IBAN azienda, causale
 * (= payment_code da mettere nel bonifico) e QR SEPA (EPC069-12) che precompila
 * il bonifico nelle app bancarie. Il QR è il target "umano" della riconciliazione:
 * il codice nella causale viene poi riabbinato all'ordine dall'import estratto conto.
 */
export default function PaymentSheet({ dealerId, paymentCode, totalDue, amountPaid = 0 }: Props) {
  const [company, setCompany] = useState<Company | null>(null);
  const remaining = Math.max(0, Math.round((totalDue - amountPaid) * 100) / 100);

  useEffect(() => {
    if (!dealerId) return;
    supabase.from('company_profile' as any).select('denominazione,iban').eq('dealer_id', dealerId).maybeSingle()
      .then(({ data }) => setCompany((data as any) ?? null));
  }, [dealerId]);

  const causale = paymentCode ? `Pagamento ordine ${paymentCode}` : '';

  // EPC069-12 (SEPA Credit Transfer) — precompila il bonifico scansionando il QR.
  const epcPayload = (company?.iban && company?.denominazione && remaining > 0)
    ? [
        'BCD', '002', '1', 'SCT', '',
        (company.denominazione || '').slice(0, 70),
        company.iban.replace(/\s+/g, ''),
        `EUR${remaining.toFixed(2)}`,
        '', '',
        causale.slice(0, 140),
      ].join('\n')
    : null;

  const qrValue = epcPayload ?? paymentCode ?? '';

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast.success(`${label} copiato`),
      () => toast.error('Copia non riuscita'),
    );
  };

  if (!paymentCode) return null;

  return (
    <Card className="print:shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <QrCode className="h-4 w-4" /> Foglio pagamento
        </CardTitle>
        <Button variant="outline" size="sm" className="gap-1 print:hidden" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Stampa
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-3 text-sm w-full">
            <Row label="Importo dovuto" value={formatEuro(remaining)} strong />
            {amountPaid > 0 && <Row label="Già pagato" value={formatEuro(amountPaid)} muted />}
            {company?.denominazione && <Row label="Beneficiario" value={company.denominazione} />}
            {company?.iban
              ? <RowCopy label="IBAN" value={company.iban} onCopy={() => copy(company.iban!, 'IBAN')} />
              : <p className="text-xs text-muted-foreground">Aggiungi l'IBAN in <code>company_profile</code> per abilitare bonifico e QR SEPA.</p>}
            <RowCopy label="Causale (obbligatoria)" value={causale} onCopy={() => copy(causale, 'Causale')} />
            <p className="text-[11px] text-muted-foreground">
              ⚠️ Inserisci la causale <strong>esatta</strong> nel bonifico: il codice <strong>{paymentCode}</strong> serve a riconoscere e registrare automaticamente il pagamento.
            </p>
          </div>
          {qrValue && (
            <div className="shrink-0 mx-auto sm:mx-0 text-center space-y-1">
              <div className="rounded-lg border border-border bg-white p-3 inline-block">
                <QRCodeSVG value={qrValue} size={148} level="M" />
              </div>
              <p className="text-[11px] text-muted-foreground max-w-[160px]">
                {epcPayload ? 'Inquadra col telefono per precompilare il bonifico' : 'Codice pagamento'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-semibold text-base' : muted ? 'text-muted-foreground' : 'font-medium'}>{value}</span>
    </div>
  );
}

function RowCopy({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <button onClick={onCopy} className="font-medium inline-flex items-center gap-1.5 hover:text-accent transition-colors text-right">
        <span className="break-all">{value}</span>
        <Copy className="h-3.5 w-3.5 shrink-0 print:hidden" />
      </button>
    </div>
  );
}
