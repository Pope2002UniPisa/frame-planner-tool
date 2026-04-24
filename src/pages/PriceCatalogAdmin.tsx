import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Trash2, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { DOOR_MODELS, ALL_FRAMES, ALL_HANDLE_FINISHES } from '@/data/doorCatalog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PriceCatalogRow {
  id: string;
  door_model_id: string;
  width_min_mm: number;
  width_max_mm: number;
  height_min_mm: number;
  height_max_mm: number;
  base_price: number;
}

interface PriceModifierRow {
  id: string;
  door_model_id: string | null;
  modifier_type: string;
  modifier_id: string;
  adjustment_type: 'fixed' | 'percentage';
  adjustment_value: number;
  label: string | null;
}

// ─── Label helpers ────────────────────────────────────────────────────────────

const MODIFIER_TYPES: Record<string, string> = {
  frame: 'Telaio', color: 'Colore porta', handle_finish: 'Finitura maniglia',
  handle_model: 'Modello maniglia', glass: 'Vetro', installation: 'Tipo fornitura', laying: 'Tipo posa',
};

const MODIFIER_OPTIONS: Record<string, { id: string; label: string }[]> = {
  frame: ALL_FRAMES.map(f => ({ id: f.id, label: f.name })),
  handle_finish: ALL_HANDLE_FINISHES.map(f => ({ id: f.id, label: f.name })),
  glass: [
    { id: 'doppio_vetro', label: 'Doppio vetro' }, { id: 'triplo_vetro', label: 'Triplo vetro' },
    { id: 'sicurezza', label: 'Vetro sicurezza' }, { id: 'cieca', label: 'Cieca' },
  ],
  installation: [
    { id: 'solo_fornitura', label: 'Solo fornitura' },
    { id: 'con_installazione', label: 'Con installazione' },
  ],
  laying: [{ id: 'standard', label: 'Standard' }, { id: 'certificata', label: 'Certificata' }],
};

const doorModelLabel = (id: string) => DOOR_MODELS.find(m => m.id === id)?.name || id;

// ─── Empty form defaults ──────────────────────────────────────────────────────

const emptyCatalog = (): Omit<PriceCatalogRow, 'id'> => ({
  door_model_id: '', width_min_mm: 600, width_max_mm: 900,
  height_min_mm: 1900, height_max_mm: 2200, base_price: 0,
});

const emptyModifier = (): Omit<PriceModifierRow, 'id'> => ({
  door_model_id: null, modifier_type: 'frame', modifier_id: '',
  adjustment_type: 'fixed', adjustment_value: 0, label: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function PriceCatalogAdmin() {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();

  const [catalog, setCatalog] = useState<PriceCatalogRow[]>([]);
  const [modifiers, setModifiers] = useState<PriceModifierRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [catalogDialog, setCatalogDialog] = useState<{ open: boolean; row: Omit<PriceCatalogRow, 'id'> & { id?: string } }>({
    open: false, row: emptyCatalog(),
  });
  const [modifierDialog, setModifierDialog] = useState<{ open: boolean; row: Omit<PriceModifierRow, 'id'> & { id?: string } }>({
    open: false, row: emptyModifier(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      supabase.from('price_catalog' as any).select('*').order('door_model_id').order('width_min_mm'),
      supabase.from('price_modifiers' as any).select('*').order('modifier_type').order('modifier_id'),
    ]).then(([c, m]) => {
      setCatalog((c.data as any[]) || []);
      setModifiers((m.data as any[]) || []);
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin) return null;

  // ── Catalog CRUD ──────────────────────────────────────────────────────────

  const saveCatalog = async () => {
    const row = catalogDialog.row;
    if (!row.door_model_id || !row.base_price) { toast.error('Compila tutti i campi'); return; }
    setSaving(true);
    if (row.id) {
      const { error } = await (supabase.from('price_catalog' as any) as any).update({
        door_model_id: row.door_model_id, width_min_mm: row.width_min_mm, width_max_mm: row.width_max_mm,
        height_min_mm: row.height_min_mm, height_max_mm: row.height_max_mm, base_price: row.base_price,
      }).eq('id', row.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      setCatalog(prev => prev.map(r => r.id === row.id ? { ...r, ...row } as PriceCatalogRow : r));
      toast.success('Aggiornato');
    } else {
      const { data, error } = await (supabase.from('price_catalog' as any) as any).insert({
        door_model_id: row.door_model_id, width_min_mm: row.width_min_mm, width_max_mm: row.width_max_mm,
        height_min_mm: row.height_min_mm, height_max_mm: row.height_max_mm, base_price: row.base_price,
      }).select('*').single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setCatalog(prev => [...prev, data as PriceCatalogRow]);
      toast.success('Aggiunto');
    }
    setSaving(false);
    setCatalogDialog({ open: false, row: emptyCatalog() });
  };

  const deleteCatalog = async (id: string) => {
    const { error } = await (supabase.from('price_catalog' as any) as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setCatalog(prev => prev.filter(r => r.id !== id));
    toast.success('Eliminato');
  };

  // ── Modifier CRUD ─────────────────────────────────────────────────────────

  const saveModifier = async () => {
    const row = modifierDialog.row;
    if (!row.modifier_type || !row.modifier_id || !row.adjustment_value) {
      toast.error('Compila tutti i campi'); return;
    }
    setSaving(true);
    const payload = {
      door_model_id: row.door_model_id || null, modifier_type: row.modifier_type,
      modifier_id: row.modifier_id, adjustment_type: row.adjustment_type,
      adjustment_value: Number(row.adjustment_value), label: row.label || null,
    };
    if (row.id) {
      const { error } = await (supabase.from('price_modifiers' as any) as any).update(payload).eq('id', row.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      setModifiers(prev => prev.map(r => r.id === row.id ? { ...r, ...payload, id: row.id } as PriceModifierRow : r));
      toast.success('Aggiornato');
    } else {
      const { data, error } = await (supabase.from('price_modifiers' as any) as any).insert(payload).select('*').single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      setModifiers(prev => [...prev, data as PriceModifierRow]);
      toast.success('Aggiunto');
    }
    setSaving(false);
    setModifierDialog({ open: false, row: emptyModifier() });
  };

  const deleteModifier = async (id: string) => {
    const { error } = await (supabase.from('price_modifiers' as any) as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setModifiers(prev => prev.filter(r => r.id !== id));
    toast.success('Eliminato');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}><ArrowLeft className="h-5 w-5" /></Button>
          <Euro className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-bold font-heading">Catalogo Prezzi</h1>
        </div>
      </header>

      <main className="container max-w-5xl py-8 space-y-8">

        {/* ── Prezzi base ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Prezzi base per modello e fascia dimensionale</CardTitle>
              <Button size="sm" className="gap-1.5" onClick={() => setCatalogDialog({ open: true, row: emptyCatalog() })}>
                <Plus className="h-4 w-4" /> Aggiungi
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Il sistema cerca la riga che contiene larghezza e altezza della porta. Se nessuna riga corrisponde, usa la stima automatica.</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Caricamento...</p>
            ) : catalog.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nessun prezzo base inserito. Clicca "Aggiungi" per iniziare.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="text-left py-2 px-3">Modello</th>
                      <th className="text-center py-2 px-3">Larghezza (mm)</th>
                      <th className="text-center py-2 px-3">Altezza (mm)</th>
                      <th className="text-right py-2 px-3">Prezzo base</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map(row => (
                      <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium">{doorModelLabel(row.door_model_id)}</td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground">{row.width_min_mm} – {row.width_max_mm}</td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground">{row.height_min_mm} – {row.height_max_mm}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-accent">€ {Number(row.base_price).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCatalogDialog({ open: true, row: { ...row } })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteCatalog(row.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Sovrapprezzi ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Sovrapprezzi per opzione</CardTitle>
              <Button size="sm" className="gap-1.5" onClick={() => setModifierDialog({ open: true, row: emptyModifier() })}>
                <Plus className="h-4 w-4" /> Aggiungi
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Si sommano al prezzo base quando il cliente seleziona quell'opzione. "Fisso" aggiunge una cifra in €, "Percentuale" applica una % sul totale.</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Caricamento...</p>
            ) : modifiers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nessun sovrapprezzo inserito.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="text-left py-2 px-3">Tipo</th>
                      <th className="text-left py-2 px-3">Opzione / ID</th>
                      <th className="text-left py-2 px-3">Solo per modello</th>
                      <th className="text-right py-2 px-3">Valore</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {modifiers.map(row => (
                      <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-xs">{MODIFIER_TYPES[row.modifier_type] || row.modifier_type}</Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium">{row.label || row.modifier_id}</span>
                          {row.label && <span className="text-xs text-muted-foreground ml-1">({row.modifier_id})</span>}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs">
                          {row.door_model_id ? doorModelLabel(row.door_model_id) : <span className="italic">Tutti</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {row.adjustment_type === 'fixed'
                            ? <span className="text-accent">+ € {Number(row.adjustment_value).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                            : <span className="text-blue-600">+ {row.adjustment_value}%</span>
                          }
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModifierDialog({ open: true, row: { ...row } })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteModifier(row.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* ── Dialog: Prezzo base ─────────────────────────────────────────────── */}
      <Dialog open={catalogDialog.open} onOpenChange={open => { if (!open) setCatalogDialog({ open: false, row: emptyCatalog() }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{catalogDialog.row.id ? 'Modifica prezzo base' : 'Aggiungi prezzo base'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Modello porta</Label>
              <Select value={catalogDialog.row.door_model_id} onValueChange={v => setCatalogDialog(d => ({ ...d, row: { ...d.row, door_model_id: v } }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona modello..." /></SelectTrigger>
                <SelectContent>
                  {DOOR_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Larghezza min (mm)</Label>
                <Input type="number" className="mt-1" value={catalogDialog.row.width_min_mm}
                  onChange={e => setCatalogDialog(d => ({ ...d, row: { ...d.row, width_min_mm: Number(e.target.value) } }))} />
              </div>
              <div>
                <Label>Larghezza max (mm)</Label>
                <Input type="number" className="mt-1" value={catalogDialog.row.width_max_mm}
                  onChange={e => setCatalogDialog(d => ({ ...d, row: { ...d.row, width_max_mm: Number(e.target.value) } }))} />
              </div>
              <div>
                <Label>Altezza min (mm)</Label>
                <Input type="number" className="mt-1" value={catalogDialog.row.height_min_mm}
                  onChange={e => setCatalogDialog(d => ({ ...d, row: { ...d.row, height_min_mm: Number(e.target.value) } }))} />
              </div>
              <div>
                <Label>Altezza max (mm)</Label>
                <Input type="number" className="mt-1" value={catalogDialog.row.height_max_mm}
                  onChange={e => setCatalogDialog(d => ({ ...d, row: { ...d.row, height_max_mm: Number(e.target.value) } }))} />
              </div>
            </div>
            <div>
              <Label>Prezzo base (€, IVA esclusa)</Label>
              <Input type="number" step="0.01" className="mt-1" value={catalogDialog.row.base_price}
                onChange={e => setCatalogDialog(d => ({ ...d, row: { ...d.row, base_price: Number(e.target.value) } }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogDialog({ open: false, row: emptyCatalog() })}>Annulla</Button>
            <Button onClick={saveCatalog} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Sovrapprezzo ────────────────────────────────────────────── */}
      <Dialog open={modifierDialog.open} onOpenChange={open => { if (!open) setModifierDialog({ open: false, row: emptyModifier() }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">{modifierDialog.row.id ? 'Modifica sovrapprezzo' : 'Aggiungi sovrapprezzo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo opzione</Label>
                <Select value={modifierDialog.row.modifier_type}
                  onValueChange={v => setModifierDialog(d => ({ ...d, row: { ...d.row, modifier_type: v, modifier_id: '' } }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MODIFIER_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Solo per modello <span className="text-muted-foreground text-xs">(opz.)</span></Label>
                <Select value={modifierDialog.row.door_model_id || '__all__'}
                  onValueChange={v => setModifierDialog(d => ({ ...d, row: { ...d.row, door_model_id: v === '__all__' ? null : v } }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tutti i modelli</SelectItem>
                    {DOOR_MODELS.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Opzione specifica (ID)</Label>
              {MODIFIER_OPTIONS[modifierDialog.row.modifier_type] ? (
                <Select value={modifierDialog.row.modifier_id}
                  onValueChange={v => {
                    const label = MODIFIER_OPTIONS[modifierDialog.row.modifier_type]?.find(o => o.id === v)?.label || '';
                    setModifierDialog(d => ({ ...d, row: { ...d.row, modifier_id: v, label } }));
                  }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    {MODIFIER_OPTIONS[modifierDialog.row.modifier_type].map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input className="mt-1" placeholder="es. uo_lichene_pure" value={modifierDialog.row.modifier_id}
                  onChange={e => setModifierDialog(d => ({ ...d, row: { ...d.row, modifier_id: e.target.value } }))} />
              )}
            </div>

            <div>
              <Label>Etichetta leggibile <span className="text-muted-foreground text-xs">(opz.)</span></Label>
              <Input className="mt-1" placeholder="es. Laccato ULTRA Opaco Lichene Pure" value={modifierDialog.row.label || ''}
                onChange={e => setModifierDialog(d => ({ ...d, row: { ...d.row, label: e.target.value } }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo aggiustamento</Label>
                <Select value={modifierDialog.row.adjustment_type}
                  onValueChange={v => setModifierDialog(d => ({ ...d, row: { ...d.row, adjustment_type: v as 'fixed' | 'percentage' } }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fisso (€)</SelectItem>
                    <SelectItem value="percentage">Percentuale (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valore {modifierDialog.row.adjustment_type === 'fixed' ? '(€)' : '(%)'}</Label>
                <Input type="number" step="0.01" className="mt-1" value={modifierDialog.row.adjustment_value}
                  onChange={e => setModifierDialog(d => ({ ...d, row: { ...d.row, adjustment_value: Number(e.target.value) } }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifierDialog({ open: false, row: emptyModifier() })}>Annulla</Button>
            <Button onClick={saveModifier} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
