import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import ContabilitaLayout from '@/components/ContabilitaLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { parseFatturaXML } from '@/lib/fatturaParser';
import { scritturaFatturaPassiva, verificaQuadratura, chiaveFattura, proponiConto, type KeywordRule, type ParsedInvoice } from '@/lib/accounting';
import { formatEuro } from '@/lib/format';

interface RawInvoice {
  id: string; chiave: string; fornitore: string; piva_fornitore: string; paese_fornitore: string;
  numero: string; data: string; imponibile: number; imposta: number; totale: number;
  intra_ue: boolean; descrizione: string; proposed_account: string | null; status: string;
}
interface Account { code: string; description: string; type: string; }

export default function ImportaContabilita() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<RawInvoice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [keywords, setKeywords] = useState<KeywordRule[]>([]);
  const [rules, setRules] = useState<Record<string, string>>({});
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [learn, setLearn] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const costAccounts = accounts.filter(a => a.type === 'COSTO');

  const loadAll = async () => {
    if (!user) return;
    const [acc, kw, cr, q] = await Promise.all([
      supabase.from('chart_of_accounts').select('code,description,type'),
      supabase.from('coding_keywords').select('keywords,account_code,priority'),
      supabase.from('coding_rules').select('piva,account_code').eq('dealer_id', user.id),
      supabase.from('invoices_raw').select('*').eq('dealer_id', user.id).eq('status', 'da_approvare').order('data', { ascending: false }),
    ]);
    setAccounts((acc.data as unknown as Account[]) ?? []);
    setKeywords(((kw.data as unknown as { keywords: string[]; account_code: string; priority: number }[]) ?? []));
    const rmap: Record<string, string> = {};
    for (const r of (cr.data as any[]) ?? []) rmap[r.piva] = r.account_code;
    setRules(rmap);
    setQueue((q.data as unknown as RawInvoice[]) ?? []);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, [user]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setBusy(true);
    let ok = 0, dup = 0, err = 0;
    const rows: any[] = [];
    for (const file of Array.from(files)) {
      try {
        const xml = await file.text();
        const inv: ParsedInvoice = parseFatturaXML(xml);
        const chiave = chiaveFattura(inv);
        const proposal = proponiConto(inv, rules, keywords);
        rows.push({
          dealer_id: user.id, chiave, fornitore: inv.fornitore, piva_fornitore: inv.piva_fornitore,
          paese_fornitore: inv.paese_fornitore, cliente: inv.cliente, tipo_doc: inv.tipo_doc,
          data: inv.data || null, numero: inv.numero, imponibile: inv.imponibile, imposta: inv.imposta,
          totale: inv.totale, aliquota: inv.aliquota, natura: inv.natura, intra_ue: inv.intra_ue,
          descrizione: inv.descrizione, proposed_account: proposal.conto, status: 'da_approvare',
        });
        ok++;
      } catch { err++; }
    }
    if (rows.length) {
      // Anti-duplicato: unique(dealer_id, chiave)
      const { error, count } = await supabase.from('invoices_raw')
        .upsert(rows, { onConflict: 'dealer_id,chiave', ignoreDuplicates: true, count: 'exact' });
      if (error) toast.error(error.message);
      dup = rows.length - (count ?? rows.length);
    }
    setBusy(false);
    toast.success(`Importate ${ok - err} fatture${dup > 0 ? `, ${dup} duplicate ignorate` : ''}${err > 0 ? `, ${err} errori` : ''}`);
    loadAll();
  };

  const approve = async (inv: RawInvoice) => {
    if (!user) return;
    const conto = chosen[inv.id] ?? inv.proposed_account ?? '';
    if (!conto) { toast.error('Seleziona un conto'); return; }
    const parsed: ParsedInvoice = {
      fornitore: inv.fornitore, paese_fornitore: inv.paese_fornitore, piva_fornitore: inv.piva_fornitore,
      cliente: '', tipo_doc: 'TD01', data: inv.data, numero: inv.numero,
      imponibile: Number(inv.imponibile), imposta: Number(inv.imposta), totale: Number(inv.totale),
      aliquota: 0, natura: '', intra_ue: inv.intra_ue, descrizione: inv.descrizione,
    };
    const lines = scritturaFatturaPassiva(parsed, conto);
    const q = verificaQuadratura(lines);
    if (!q.ok) { toast.error(`Scrittura non quadra (D ${q.totDare} ≠ A ${q.totAvere})`); return; }

    const { data: entry, error: eErr } = await supabase.from('journal_entries').insert({
      dealer_id: user.id, chiave: inv.chiave, data: inv.data, controparte: inv.fornitore,
      numero: inv.numero, tipo: 'passiva', intra_ue: inv.intra_ue, stato: 'registrata',
    }).select('id').single();
    if (eErr || !entry) { toast.error(eErr?.message ?? 'Errore'); return; }
    const entryId = (entry as any).id;

    const { error: lErr } = await supabase.from('journal_lines').insert(
      lines.map((l, i) => ({ entry_id: entryId, account_code: l.account_code, descr: l.descr, dare: l.dare, avere: l.avere, sort_order: i })),
    );
    if (lErr) { toast.error(lErr.message); return; }

    await supabase.from('invoices_raw').update({ status: 'registrata', entry_id: entryId }).eq('id', inv.id);

    if (learn[inv.id] && inv.piva_fornitore) {
      await supabase.from('coding_rules').upsert(
        { dealer_id: user.id, piva: inv.piva_fornitore, account_code: conto },
        { onConflict: 'dealer_id,piva' },
      );
    }
    toast.success('Registrata in partita doppia');
    setQueue(prev => prev.filter(x => x.id !== inv.id));
  };

  return (
    <ContabilitaLayout>
      <Card>
        <CardHeader><CardTitle className="font-heading text-base">Importa fatture (XML FatturaPA)</CardTitle></CardHeader>
        <CardContent>
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 cursor-pointer hover:bg-muted/40 transition-colors">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{busy ? 'Elaborazione…' : 'Trascina o seleziona i file .xml esportati da Aruba / Fatture in Cloud'}</span>
            <input type="file" accept=".xml" multiple className="hidden" disabled={busy} onChange={e => handleFiles(e.target.files)} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-base">Da approvare ({queue.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna fattura in coda.</p>
          ) : queue.map(inv => (
            <div key={inv.id} className="rounded-lg border border-border p-3 bg-background space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">{inv.fornitore}</span>
                  <span className="text-xs text-muted-foreground ml-2">n. {inv.numero} · {inv.data}</span>
                  {inv.intra_ue && <Badge variant="secondary" className="ml-2 text-[10px]">reverse charge</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">
                  imp. {formatEuro(inv.imponibile)} · IVA {formatEuro(inv.imposta)}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={chosen[inv.id] ?? inv.proposed_account ?? ''} onValueChange={v => setChosen(p => ({ ...p, [inv.id]: v }))}>
                  <SelectTrigger className="w-72"><SelectValue placeholder="Scegli il conto costo" /></SelectTrigger>
                  <SelectContent>
                    {costAccounts.map(a => <SelectItem key={a.code} value={a.code}>{a.code} — {a.description}</SelectItem>)}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={!!learn[inv.id]} onCheckedChange={v => setLearn(p => ({ ...p, [inv.id]: !!v }))} />
                  memorizza regola fornitore
                </label>
                <Button size="sm" className="ml-auto" onClick={() => approve(inv)}>Approva e registra</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </ContabilitaLayout>
  );
}
