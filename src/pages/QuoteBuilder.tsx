import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { productLabels } from '@/lib/constants';
import { formatEuro } from '@/lib/format';
import { computeQuote, type QuoteLineInput, ORDINARY_VAT_RATE } from '@/lib/quoteEngine';

interface Detrazione { id: string; name: string; percentage: number; cap: number | null; active: boolean; }

type LineRow = QuoteLineInput & { key: string };
const newLine = (): LineRow => ({ key: crypto.randomUUID(), description: '', qty: 1, unitNetPrice: 0, markup: 0, vatRate: ORDINARY_VAT_RATE, isBeneSignificativo: false });

export default function QuoteBuilder() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const measurementId = params.get('measurement');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('Preventivo');
  const [lines, setLines] = useState<LineRow[]>([newLine()]);
  const [posa, setPosa] = useState('0');
  const [trasporto, setTrasporto] = useState('0');
  const [markup, setMarkup] = useState('0');
  const [agevolata, setAgevolata] = useState(false);
  const [detrazioneId, setDetrazioneId] = useState('none');
  const [detrazioni, setDetrazioni] = useState<Detrazione[]>([]);
  const [linkedMeasurement, setLinkedMeasurement] = useState<string | null>(measurementId);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: detr } = await supabase.from('detrazioni' as any).select('*').eq('active', true);
      setDetrazioni((detr as unknown as Detrazione[]) ?? []);

      if (id) {
        // Carica preventivo esistente
        const { data: q } = await supabase.from('dealer_quotes' as any).select('*').eq('id', id).eq('dealer_id', user.id).single();
        const quote = q as any;
        if (quote) {
          setTitle(quote.title ?? 'Preventivo');
          setPosa(String(quote.posa_amount ?? 0));
          setTrasporto(String(quote.trasporto_amount ?? 0));
          setMarkup(String(quote.markup_amount ?? 0));
          setDetrazioneId(quote.detrazione_id ?? 'none');
          setLinkedMeasurement(quote.measurement_id ?? null);
          setAgevolata((quote.vat_10_base ?? 0) > 0);
          const { data: ql } = await supabase.from('quote_lines' as any).select('*').eq('quote_id', id).order('sort_order');
          const rows = (ql as any[]) ?? [];
          if (rows.length) {
            setLines(rows.map(r => ({
              key: r.id, description: r.description ?? '', qty: Number(r.qty), unitNetPrice: Number(r.unit_net_price),
              markup: Number(r.markup), vatRate: Number(r.vat_rate), isBeneSignificativo: !!r.is_bene_significativo,
            })));
          }
        }
      } else if (measurementId) {
        // Prefill da misurazione
        const { data: m } = await supabase.from('measurements').select('product_type,estimated_price,client_name').eq('id', measurementId).single();
        if (m) {
          setTitle(`Preventivo — ${m.client_name || productLabels[m.product_type] || 'misurazione'}`);
          setLines([{
            key: crypto.randomUUID(),
            description: productLabels[m.product_type] || m.product_type,
            qty: 1, unitNetPrice: Number(m.estimated_price ?? 0), markup: 0,
            vatRate: ORDINARY_VAT_RATE, isBeneSignificativo: true,
          }]);
        }
      }
      setLoading(false);
    };
    load();
  }, [user, id, measurementId]);

  const result = useMemo(() => computeQuote({
    lines: lines.map(l => ({ ...l, qty: Number(l.qty) || 0, unitNetPrice: Number(l.unitNetPrice) || 0, markup: Number(l.markup) || 0, vatRate: Number(l.vatRate) })),
    posa: Number(posa) || 0, trasporto: Number(trasporto) || 0, markup: Number(markup) || 0,
    agevolata,
    detrazione: detrazioneId !== 'none'
      ? (() => { const d = detrazioni.find(x => x.id === detrazioneId); return d ? { percentage: d.percentage, cap: d.cap } : null; })()
      : null,
  }), [lines, posa, trasporto, markup, agevolata, detrazioneId, detrazioni]);

  const updateLine = (key: string, patch: Partial<LineRow>) =>
    setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const d = detrazioneId !== 'none' ? detrazioni.find(x => x.id === detrazioneId) : null;
    const payload = {
      dealer_id: user.id,
      measurement_id: linkedMeasurement,
      title,
      subtotal_net: result.subtotalNet,
      markup_amount: Number(markup) || 0,
      posa_amount: Number(posa) || 0,
      trasporto_amount: Number(trasporto) || 0,
      taxable_base: result.taxableTotal,
      vat_10_base: result.vat10Base,
      vat_22_base: result.vat22Base,
      vat_amount: result.vatAmount,
      detrazione_id: d?.id ?? null,
      detrazione_amount: result.detrazioneAmount,
      total_gross: result.totalGross,
      total_net_of_bonus: result.totalNetOfBonus,
    };
    let quoteId = id;
    if (id) {
      const { error } = await supabase.from('dealer_quotes' as any).update(payload).eq('id', id);
      if (error) { setSaving(false); toast.error(error.message); return; }
      await supabase.from('quote_lines' as any).delete().eq('quote_id', id);
    } else {
      const { data, error } = await supabase.from('dealer_quotes' as any).insert(payload).select('id').single();
      if (error || !data) { setSaving(false); toast.error(error?.message ?? 'Errore'); return; }
      quoteId = (data as any).id;
    }
    const lineRows = lines.map((l, i) => ({
      quote_id: quoteId, description: l.description ?? '', qty: Number(l.qty) || 0,
      unit_net_price: Number(l.unitNetPrice) || 0, markup: Number(l.markup) || 0,
      line_total: result.lines[i]?.lineTaxable ?? 0, vat_rate: Number(l.vatRate),
      is_bene_significativo: !!l.isBeneSignificativo, sort_order: i,
    }));
    const { error: lErr } = await supabase.from('quote_lines' as any).insert(lineRows);
    setSaving(false);
    if (lErr) { toast.error(lErr.message); return; }
    toast.success('Preventivo salvato');
    if (!id && quoteId) navigate(`/preventivo/${quoteId}`, { replace: true });
  };

  if (loading) return <AppLayout><div className="p-6 max-w-4xl mx-auto space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}</div></AppLayout>;

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Indietro</Button>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="max-w-sm font-semibold" />
          {id && (
            <Button variant="outline" size="sm" className="gap-1.5 ml-auto" onClick={() => navigate(`/preventivo/${id}/stampa`)}>
              <Printer className="h-4 w-4" /> Stampa
            </Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle className="font-heading text-base">Righe (netto acquisto a monte)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lines.map(l => (
              <div key={l.key} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-4 space-y-1">
                  <Label className="text-xs">Descrizione</Label>
                  <Input value={l.description} onChange={e => updateLine(l.key, { description: e.target.value })} />
                </div>
                <div className="col-span-3 sm:col-span-1 space-y-1">
                  <Label className="text-xs">Q.tà</Label>
                  <Input type="number" value={l.qty} onChange={e => updateLine(l.key, { qty: Number(e.target.value) })} />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Prezzo netto</Label>
                  <Input type="number" value={l.unitNetPrice} onChange={e => updateLine(l.key, { unitNetPrice: Number(e.target.value) })} />
                </div>
                <div className="col-span-3 sm:col-span-2 space-y-1">
                  <Label className="text-xs">Ricarico</Label>
                  <Input type="number" value={l.markup} onChange={e => updateLine(l.key, { markup: Number(e.target.value) })} />
                </div>
                <div className="col-span-6 sm:col-span-2 space-y-1">
                  <Label className="text-xs">IVA %</Label>
                  <Select value={String(l.vatRate)} onValueChange={v => updateLine(l.key, { vatRate: Number(v) })} disabled={agevolata}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4%</SelectItem>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="22">22%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-5 sm:col-span-1 flex items-center gap-1.5 pb-2">
                  <Switch checked={!!l.isBeneSignificativo} onCheckedChange={v => updateLine(l.key, { isBeneSignificativo: v })} title="Bene significativo" />
                  <span className="text-[10px] text-muted-foreground leading-tight">bene signif.</span>
                </div>
                <div className="col-span-1 pb-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setLines(prev => prev.length > 1 ? prev.filter(x => x.key !== l.key) : prev)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLines(prev => [...prev, newLine()])}>
              <Plus className="h-4 w-4" /> Aggiungi riga
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="font-heading text-base">Servizi e regime</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label className="text-xs">Posa (€)</Label><Input type="number" value={posa} onChange={e => setPosa(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Trasporto (€)</Label><Input type="number" value={trasporto} onChange={e => setTrasporto(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Ricarico glob. (€)</Label><Input type="number" value={markup} onChange={e => setMarkup(e.target.value)} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">IVA agevolata (ristrutturazione)</p>
                  <p className="text-xs text-muted-foreground">Split 10/22 con regola beni significativi</p>
                </div>
                <Switch checked={agevolata} onCheckedChange={setAgevolata} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Detrazione fiscale</Label>
                <Select value={detrazioneId} onValueChange={setDetrazioneId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nessuna</SelectItem>
                    {detrazioni.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/40">
            <CardHeader><CardTitle className="font-heading text-base">Totali</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Netto acquisto (a monte)" value={formatEuro(result.subtotalNet)} muted />
              <Row label="Ricarico" value={formatEuro(result.markupTotal)} muted />
              <Row label="Posa + trasporto" value={formatEuro(result.posa + result.trasporto)} muted />
              <div className="h-px bg-border my-1.5" />
              <Row label="Imponibile" value={formatEuro(result.taxableTotal)} />
              {result.vatBreakdown.map(b => (
                <Row key={b.rate} label={`IVA ${b.rate}% su ${formatEuro(b.base)}`} value={formatEuro(b.vat)} muted />
              ))}
              <Row label="Totale IVA inclusa" value={formatEuro(result.totalGross)} bold />
              {result.detrazioneAmount > 0 && (
                <>
                  <Row label="Detrazione" value={`− ${formatEuro(result.detrazioneAmount)}`} muted />
                  <div className="h-px bg-border my-1.5" />
                  <Row label="Prezzo al netto del bonus" value={formatEuro(result.totalNetOfBonus)} bold accent />
                </>
              )}
              <Button onClick={handleSave} disabled={saving} className="w-full mt-3">
                {saving ? 'Salvataggio…' : 'Salva preventivo'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                ⚠️ Regime IVA e detrazioni da validare col commercialista.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value, muted, bold, accent }: { label: string; value: string; muted?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-muted-foreground' : bold ? 'font-semibold' : ''}>{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${accent ? 'text-accent' : ''}`}>{value}</span>
    </div>
  );
}
