import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import pratelliLogo from '@/assets/pratelli-logo.png';
import { formatEuro } from '@/lib/format';

interface QuoteLine { id: string; description: string; qty: number; unit_net_price: number; markup: number; line_total: number; vat_rate: number; is_bene_significativo: boolean; sort_order: number; }

export default function QuotePrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<any>(null);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    html.classList.remove('dark');
    return () => { if (wasDark) html.classList.add('dark'); };
  }, []);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data: q } = await supabase.from('dealer_quotes').select('*').eq('id', id).eq('dealer_id', user.id).single();
      setQuote(q);
      const { data: ql } = await supabase.from('quote_lines').select('*').eq('quote_id', id).order('sort_order');
      setLines((ql as unknown as QuoteLine[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user, id]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Caricamento…</div>;
  if (!quote) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Preventivo non trovato</div>;

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="print:hidden sticky top-0 flex items-center gap-2 bg-white border-b p-3">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Indietro</Button>
        <Button size="sm" className="gap-1.5 ml-auto" onClick={() => window.print()}><Printer className="h-4 w-4" /> Stampa</Button>
      </div>

      <div className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <img src={pratelliLogo} alt="Pratelli" style={{ height: 40 }} />
          <div className="text-right">
            <h1 className="text-2xl font-bold">Preventivo</h1>
            <p className="text-sm text-gray-500">{new Date(quote.created_at).toLocaleDateString('it-IT')}</p>
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-4">{quote.title}</h2>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-300 text-left">
              <th className="py-2">Descrizione</th>
              <th className="py-2 text-right">Q.tà</th>
              <th className="py-2 text-right">Prezzo</th>
              <th className="py-2 text-right">IVA</th>
              <th className="py-2 text-right">Imponibile</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(l => (
              <tr key={l.id} className="border-b border-gray-200">
                <td className="py-2">{l.description}{l.is_bene_significativo && <span className="text-xs text-gray-400"> (bene significativo)</span>}</td>
                <td className="py-2 text-right">{l.qty}</td>
                <td className="py-2 text-right">{formatEuro(l.unit_net_price)}</td>
                <td className="py-2 text-right">{l.vat_rate}%</td>
                <td className="py-2 text-right">{formatEuro(l.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <Row label="Posa" value={formatEuro(quote.posa_amount)} />
          <Row label="Trasporto" value={formatEuro(quote.trasporto_amount)} />
          <Row label="Imponibile" value={formatEuro(quote.taxable_base)} />
          {Number(quote.vat_10_base) > 0 && <Row label={`IVA 10% su ${formatEuro(quote.vat_10_base)}`} value={formatEuro(Number(quote.vat_10_base) * 0.10)} />}
          {Number(quote.vat_22_base) > 0 && <Row label={`IVA 22% su ${formatEuro(quote.vat_22_base)}`} value={formatEuro(Number(quote.vat_22_base) * 0.22)} />}
          <div className="border-t border-gray-300 my-1" />
          <Row label="Totale IVA inclusa" value={formatEuro(quote.total_gross)} bold />
          {Number(quote.detrazione_amount) > 0 && (
            <>
              <Row label="Detrazione fiscale" value={`− ${formatEuro(quote.detrazione_amount)}`} />
              <Row label="Prezzo al netto del bonus" value={formatEuro(quote.total_net_of_bonus)} bold />
            </>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Preventivo indicativo. Regime IVA e detrazioni soggetti a validazione fiscale.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? 'font-bold' : ''}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
