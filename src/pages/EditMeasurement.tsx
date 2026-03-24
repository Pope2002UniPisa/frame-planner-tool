import { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, Ruler, Upload, Save, Clock, Truck, ZoomIn, ZoomOut } from 'lucide-react';
import ProductDiagram, { COLOR_OPTIONS } from '@/components/ProductDiagram';
import AccessoryConfig, { type AccessoriesConfig } from '@/components/AccessoryConfig';

const STEPS = [
  { id: 'product', label: 'Prodotto' },
  { id: 'client', label: 'Cliente' },
  { id: 'survey', label: 'Tipo Rilievo' },
  { id: 'dimensions', label: 'Misure' },
  { id: 'config', label: 'Configurazione' },
  { id: 'finishes', label: 'Finiture' },
  { id: 'glass', label: 'Vetro' },
  { id: 'accessories', label: 'Accessori' },
  { id: 'installation', label: 'Installazione' },
  { id: 'notes', label: 'Note & Foto' },
];

const DELIVERY_OPTIONS = [
  { value: 'express', label: '🚀 Urgente (2-3 settimane)', desc: 'Consegna rapida per misure e colori standard', surcharge: '+25%', standard_only: true, maxWeeks: 3 },
  { value: 'standard', label: '📦 Standard (4-6 settimane)', desc: 'Tempi normali di produzione', surcharge: 'Prezzo base', standard_only: false, maxWeeks: 6 },
  { value: 'economy', label: '📅 Programmata (8+ settimane)', desc: 'Consegna programmata a lungo termine', surcharge: '+10%', standard_only: false, minWeeks: 8 },
];

export default function EditMeasurement() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>(null);
  const [accessoriesConfig, setAccessoriesConfig] = useState<AccessoriesConfig>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [diagramZoom, setDiagramZoom] = useState(100);
  const [zoomExternal, setZoomExternal] = useState(100);
  const [zoomInternal, setZoomInternal] = useState(100);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from('measurements').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setForm({
          product_type: data.product_type,
          client_name: data.client_name || '',
          client_address: data.client_address || '',
          survey_type: data.survey_type || '',
          width_mm: String(data.width_mm),
          height_mm: String(data.height_mm),
          depth_mm: data.depth_mm ? String(data.depth_mm) : '',
          is_square: data.is_square ?? true,
          out_of_square_mm: data.out_of_square_mm ? String(data.out_of_square_mm) : '',
          is_plumb: data.is_plumb ?? true,
          is_level: data.is_level ?? true,
          internal_space_mm: data.internal_space_mm ? String(data.internal_space_mm) : '',
          external_space_mm: data.external_space_mm ? String(data.external_space_mm) : '',
          num_panels: String(data.num_panels || 1),
          panel_type: data.panel_type || '',
          opening_direction: data.opening_direction || '',
          frame_type: data.frame_type || '',
          material: data.material || '',
          color_internal: data.color_internal || '',
          color_external: data.color_external || '',
          handle_type: data.handle_type || '',
          glass_type: data.glass_type || '',
          has_mosquito_net: data.has_mosquito_net || false,
          has_shutter: data.has_shutter || false,
          has_box: data.has_box || false,
          has_motorization: data.has_motorization || false,
          installation_type: data.installation_type || '',
          laying_type: data.laying_type || '',
          remove_old: data.remove_old || false,
          delivery_time: '',
          delivery_date: '',
          notes: data.notes || '',
          photo_urls: data.photo_urls || [],
          status: data.status,
        });
        setAccessoriesConfig((data.accessories_config as any) || {});
      }
      setLoading(false);
    });
  }, [user, id]);

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!form) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Misurazione non trovata</div>;
  if (form.status !== 'bozza') return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Solo le bozze possono essere modificate</div>;

  const update = (key: string, value: any) => setForm((prev: any) => ({ ...prev, [key]: value }));

  const canGoNext = (): boolean => {
    switch (step) {
      case 0: return !!form.product_type;
      case 1: return !!form.client_name;
      case 2: return !!form.survey_type;
      case 3: return !!form.width_mm && !!form.height_mm;
      default: return true;
    }
  };

  const getDraftName = () => {
    const parts = [];
    if (form.client_address) parts.push(form.client_address);
    if (form.client_name) parts.push(form.client_name);
    return parts.length > 0 ? `${parts.join('; ')} - Bozza Salvata` : 'Bozza Salvata';
  };

  const buildUpdateData = (status?: string) => ({
    product_type: form.product_type,
    client_name: form.client_name,
    client_address: form.client_address,
    survey_type: form.survey_type || 'foro_muro',
    width_mm: parseInt(form.width_mm) || 0,
    height_mm: parseInt(form.height_mm) || 0,
    depth_mm: form.depth_mm ? parseInt(form.depth_mm) : null,
    is_square: form.is_square,
    out_of_square_mm: form.out_of_square_mm ? parseInt(form.out_of_square_mm) : null,
    is_plumb: form.is_plumb,
    is_level: form.is_level,
    internal_space_mm: form.internal_space_mm ? parseInt(form.internal_space_mm) : null,
    external_space_mm: form.external_space_mm ? parseInt(form.external_space_mm) : null,
    num_panels: parseInt(form.num_panels),
    panel_type: form.panel_type || null,
    opening_direction: form.opening_direction || null,
    frame_type: form.frame_type || null,
    material: form.material || null,
    color_internal: form.color_internal || null,
    color_external: form.color_external || null,
    handle_type: form.handle_type || null,
    glass_type: form.glass_type || null,
    has_mosquito_net: form.has_mosquito_net,
    has_shutter: form.has_shutter,
    has_box: form.has_box,
    has_motorization: form.has_motorization,
    installation_type: form.installation_type || null,
    laying_type: form.laying_type || null,
    remove_old: form.remove_old,
    notes: form.notes || null,
    accessories_config: accessoriesConfig as any,
    ...(status ? { status } : {}),
  });

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      let photo_urls = form.photo_urls || [];
      for (const file of photoFiles) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('measurement-photos').upload(fileName, file);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('measurement-photos').getPublicUrl(fileName);
          photo_urls = [...photo_urls, publicUrl];
        }
      }
      const { error } = await supabase.from('measurements').update({
        ...buildUpdateData(),
        photo_urls: photo_urls.length > 0 ? photo_urls : null,
      }).eq('id', id);
      if (error) throw error;
      toast.success(getDraftName(), { description: 'Bozza aggiornata con successo.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Errore');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let photo_urls = form.photo_urls || [];
      for (const file of photoFiles) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('measurement-photos').upload(fileName, file);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('measurement-photos').getPublicUrl(fileName);
          photo_urls = [...photo_urls, publicUrl];
        }
      }
      const { error } = await supabase.from('measurements').update({
        ...buildUpdateData('ricevuto'),
        photo_urls: photo_urls.length > 0 ? photo_urls : null,
      }).eq('id', id);
      if (error) throw error;
      toast.success('Misurazione inviata con successo!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || "Errore durante l'invio");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setPhotoFiles(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  const showDiagram = step >= 3 && step <= 6 && !!form.product_type;
  const showDualDiagram = step === 5;

  const ColorSelectField = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={v => update(field, v)}>
        <SelectTrigger>
          <div className="flex items-center gap-2">
            {value && <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: COLOR_OPTIONS.find(c => c.value === value)?.hex }} />}
            <SelectValue placeholder="Seleziona colore..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          {COLOR_OPTIONS.map(c => (
            <SelectItem key={c.value} value={c.value}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                {c.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const DiagramWithZoom = ({ view, zoom, setZoom }: { view?: 'internal' | 'external'; zoom: number; setZoom: (fn: (prev: number) => number) => void }) => (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-heading">
            {view === 'internal' ? 'Vista Interna' : view === 'external' ? 'Vista Esterna' : 'Anteprima'}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(50, z - 10))}><ZoomOut className="h-3.5 w-3.5" /></Button>
            <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(200, z + 10))}><ZoomIn className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto" style={{ maxHeight: zoom > 100 ? '500px' : undefined }}>
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            <ProductDiagram productType={form.product_type} widthMm={form.width_mm} heightMm={form.height_mm} depthMm={form.depth_mm} numPanels={form.num_panels} panelType={form.panel_type} openingDirection={form.opening_direction} handleType={form.handle_type} glassType={form.glass_type} frameType={form.frame_type} colorInternal={form.color_internal} colorExternal={form.color_external} internalSpaceMm={form.internal_space_mm} externalSpaceMm={form.external_space_mm} view={view} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <Ruler className="h-5 w-5 text-accent" />
          <h1 className="text-lg font-bold font-heading text-foreground">Modifica Misurazione</h1>
        </div>
      </header>

      <main className="container max-w-4xl py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Passo {step + 1} di {STEPS.length}: {STEPS[step].label}</span>
            <span className="text-sm text-muted-foreground">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full gradient-accent transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {showDiagram && !showDualDiagram && (
          <div className="mb-6"><DiagramWithZoom zoom={diagramZoom} setZoom={setDiagramZoom} /></div>
        )}
        {showDualDiagram && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DiagramWithZoom view="external" zoom={zoomExternal} setZoom={setZoomExternal} />
            <DiagramWithZoom view="internal" zoom={zoomInternal} setZoom={setZoomInternal} />
          </div>
        )}

        <Card className="animate-fade-in">
          <CardContent className="py-6">
            {/* Step 0: Product */}
            {step === 0 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Tipo prodotto</CardTitle>
                <CardDescription>Prodotto selezionato (non modificabile)</CardDescription>
                <div className="rounded-lg border-2 border-accent bg-accent/10 p-4">
                  <span className="text-lg font-semibold">{
                    { finestra: '🪟 Finestra', porta_finestra: '🚪 Porta Finestra', basculante: '🏗️ Basculante', zanzariera: '🦟 Zanzariera', persiana: '🪵 Persiana' }[form.product_type] || form.product_type
                  }</span>
                </div>
              </div>
            )}

            {/* Step 1: Client */}
            {step === 1 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Dati cliente</CardTitle>
                <div className="space-y-2"><Label>Nome / Riferimento Cliente</Label><Input value={form.client_name} onChange={e => update('client_name', e.target.value)} /></div>
                <div className="space-y-2"><Label>Indirizzo installazione</Label><Input value={form.client_address} onChange={e => update('client_address', e.target.value)} /></div>
              </div>
            )}

            {/* Step 2: Survey */}
            {step === 2 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Tipo di rilievo</CardTitle>
                <RadioGroup value={form.survey_type} onValueChange={v => update('survey_type', v)} className="space-y-3">
                  {[
                    { value: 'foro_muro', label: 'Foro muro (grezzo)' },
                    { value: 'luce_netta', label: 'Luce netta' },
                    { value: 'controtelaio', label: 'Controtelaio' },
                    { value: 'vecchio_infisso', label: 'Vecchio infisso' },
                  ].map(opt => (
                    <Label key={opt.value} htmlFor={`s-${opt.value}`} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.survey_type === opt.value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                      <RadioGroupItem value={opt.value} id={`s-${opt.value}`} /> {opt.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Step 3: Dimensions */}
            {step === 3 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Misure (in mm)</CardTitle>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2"><Label>Larghezza (mm) *</Label><Input type="number" value={form.width_mm} onChange={e => update('width_mm', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Altezza (mm) *</Label><Input type="number" value={form.height_mm} onChange={e => update('height_mm', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Profondità muro (mm)</Label><Input type="number" value={form.depth_mm} onChange={e => update('depth_mm', e.target.value)} /></div>
                </div>
                <div className="space-y-3 pt-4">
                  <Label className="text-base font-semibold">Controlli tecnici</Label>
                  <div className="flex items-center gap-3"><Checkbox id="sq" checked={form.is_square} onCheckedChange={v => update('is_square', v)} /><Label htmlFor="sq">Squadrato</Label></div>
                  {!form.is_square && <div className="ml-8 space-y-2"><Label>Fuori squadro (mm)</Label><Input type="number" value={form.out_of_square_mm} onChange={e => update('out_of_square_mm', e.target.value)} /></div>}
                  <div className="flex items-center gap-3"><Checkbox id="pl" checked={form.is_plumb} onCheckedChange={v => update('is_plumb', v)} /><Label htmlFor="pl">A piombo</Label></div>
                  <div className="flex items-center gap-3"><Checkbox id="lv" checked={form.is_level} onCheckedChange={v => update('is_level', v)} /><Label htmlFor="lv">Livellato</Label></div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-2"><Label>Spazio interno (mm)</Label><Input type="number" value={form.internal_space_mm} onChange={e => update('internal_space_mm', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Spazio esterno (mm)</Label><Input type="number" value={form.external_space_mm} onChange={e => update('external_space_mm', e.target.value)} /></div>
                </div>
              </div>
            )}

            {/* Step 4: Configuration */}
            {step === 4 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Configurazione</CardTitle>
                <div className="space-y-2">
                  <Label>Numero ante</Label>
                  <Select value={form.num_panels} onValueChange={v => update('num_panels', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">1 anta</SelectItem><SelectItem value="2">2 ante</SelectItem><SelectItem value="3">3 ante</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipologia apertura</Label>
                  <Select value={form.panel_type} onValueChange={v => update('panel_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="battente">Battente</SelectItem>
                      <SelectItem value="anta_ribalta">Anta-Ribalta</SelectItem>
                      <SelectItem value="vasistas">Vasistas</SelectItem>
                      <SelectItem value="scorrevole">Scorrevole</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Direzione apertura</Label>
                  <RadioGroup value={form.opening_direction} onValueChange={v => update('opening_direction', v)} className="flex gap-4">
                    <Label htmlFor="ed-dx" className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="destra" id="ed-dx" /> Destra</Label>
                    <Label htmlFor="ed-sx" className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="sinistra" id="ed-sx" /> Sinistra</Label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Tipo telaio</Label>
                  <Select value={form.frame_type} onValueChange={v => update('frame_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="ridotto">Ridotto</SelectItem><SelectItem value="maggiorato">Maggiorato</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 5: Finishes */}
            {step === 5 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Finiture</CardTitle>
                <div className="space-y-2">
                  <Label>Materiale</Label>
                  <RadioGroup value={form.material} onValueChange={v => update('material', v)} className="flex flex-wrap gap-3">
                    {[{ value: 'pvc', label: 'PVC' }, { value: 'alluminio', label: 'Alluminio' }, { value: 'legno', label: 'Legno' }].map(opt => (
                      <Label key={opt.value} htmlFor={`em-${opt.value}`} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all ${form.material === opt.value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                        <RadioGroupItem value={opt.value} id={`em-${opt.value}`} /> {opt.label}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ColorSelectField label="Colore interno" value={form.color_internal} field="color_internal" />
                  <ColorSelectField label="Colore esterno" value={form.color_external} field="color_external" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo maniglia</Label>
                  <Select value={form.handle_type} onValueChange={v => update('handle_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="design">Design</SelectItem><SelectItem value="con_chiave">Con chiave</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 6: Glass */}
            {step === 6 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Vetro</CardTitle>
                <RadioGroup value={form.glass_type} onValueChange={v => update('glass_type', v)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { value: 'doppio', label: 'Doppio vetro' },
                    { value: 'triplo', label: 'Triplo vetro' },
                    { value: 'basso_emissivo', label: 'Basso emissivo' },
                    { value: 'antisfondamento', label: 'Antisfondamento' },
                    { value: 'satinato', label: 'Satinato' },
                    { value: 'selettivo', label: 'Selettivo' },
                  ].map(opt => (
                    <Label key={opt.value} htmlFor={`eg-${opt.value}`} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.glass_type === opt.value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                      <RadioGroupItem value={opt.value} id={`eg-${opt.value}`} /> {opt.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Step 7: Accessories */}
            {step === 7 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Accessori</CardTitle>
                <div className="space-y-3">
                  {[
                    { key: 'has_mosquito_net', label: '🦟 Zanzariera', type: 'mosquito_net' },
                    { key: 'has_shutter', label: '🪟 Tapparella', type: 'shutter' },
                    { key: 'has_box', label: '📦 Cassonetto', type: 'box' },
                    { key: 'has_motorization', label: '⚡ Motorizzazione', type: 'motorization' },
                  ].map(acc => (
                    <div key={acc.key}>
                      <Label htmlFor={acc.key} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form[acc.key] ? 'border-accent bg-accent/10' : 'border-border'}`}>
                        <Checkbox id={acc.key} checked={form[acc.key]} onCheckedChange={v => update(acc.key, v)} />
                        <span className="text-lg">{acc.label}</span>
                      </Label>
                      {form[acc.key] && <AccessoryConfig type={acc.type} config={accessoriesConfig} onChange={setAccessoriesConfig} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 8: Installation */}
            {step === 8 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Installazione</CardTitle>
                <div className="space-y-2">
                  <Label>Tipo fornitura</Label>
                  <RadioGroup value={form.installation_type} onValueChange={v => update('installation_type', v)} className="space-y-3">
                    <Label htmlFor="ei-f" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.installation_type === 'solo_fornitura' ? 'border-accent bg-accent/10' : 'border-border'}`}>
                      <RadioGroupItem value="solo_fornitura" id="ei-f" /> Solo fornitura
                    </Label>
                    <Label htmlFor="ei-i" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.installation_type === 'con_installazione' ? 'border-accent bg-accent/10' : 'border-border'}`}>
                      <RadioGroupItem value="con_installazione" id="ei-i" /> Con installazione
                    </Label>
                  </RadioGroup>
                </div>
                {form.installation_type === 'con_installazione' && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo posa</Label>
                      <RadioGroup value={form.laying_type} onValueChange={v => update('laying_type', v)} className="flex gap-4">
                        <Label htmlFor="el-s" className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="standard" id="el-s" /> Standard</Label>
                        <Label htmlFor="el-c" className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="certificata" id="el-c" /> Certificata</Label>
                      </RadioGroup>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox id="ero" checked={form.remove_old} onCheckedChange={v => update('remove_old', v)} />
                      <Label htmlFor="ero">Rimozione vecchio infisso</Label>
                    </div>
                  </>
                )}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-accent" /><Label className="text-base font-semibold">Tempi di consegna</Label></div>
                  <RadioGroup value={form.delivery_time} onValueChange={v => { update('delivery_time', v); update('delivery_date', ''); }} className="space-y-3">
                    {DELIVERY_OPTIONS.map(opt => (
                      <Label key={opt.value} htmlFor={`ed-${opt.value}`} className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all ${form.delivery_time === opt.value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                        <RadioGroupItem value={opt.value} id={`ed-${opt.value}`} className="mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{opt.label}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${opt.value === 'express' ? 'bg-destructive/10 text-destructive' : opt.value === 'economy' ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>{opt.surcharge}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{opt.desc}</p>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                  {form.delivery_time && (
                    <div className="space-y-2 mt-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Label className="text-sm font-medium">📅 Data di consegna desiderata</Label>
                      <Input type="date" value={form.delivery_date || ''} onChange={e => update('delivery_date', e.target.value)}
                        min={(() => { const d = new Date(); d.setDate(d.getDate() + (form.delivery_time === 'express' ? 14 : form.delivery_time === 'standard' ? 28 : 56)); return d.toISOString().split('T')[0]; })()}
                        max={(() => { const d = new Date(); if (form.delivery_time === 'express') d.setDate(d.getDate() + 21); else if (form.delivery_time === 'standard') d.setDate(d.getDate() + 42); return form.delivery_time === 'economy' ? '' : d.toISOString().split('T')[0]; })()}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 9: Notes & Photos */}
            {step === 9 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Note e Foto</CardTitle>
                <div className="space-y-2">
                  <Label>Note tecniche</Label>
                  <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={4} />
                </div>
                {form.photo_urls && form.photo_urls.length > 0 && (
                  <div><Label className="mb-2 block">Foto esistenti</Label><div className="grid grid-cols-3 gap-2">{form.photo_urls.map((url: string, i: number) => <img key={i} src={url} alt={`Foto ${i+1}`} className="rounded-lg w-full h-24 object-cover" />)}</div></div>
                )}
                <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">Carica foto</p>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" id="photo-edit" />
                  <Button variant="outline" asChild><label htmlFor="photo-edit" className="cursor-pointer">Seleziona foto</label></Button>
                </div>
                {photoFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">{photoFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-sm">📷 {f.name}<button onClick={() => setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">✕</button></div>
                  ))}</div>
                )}
                <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                  <p className="text-sm text-foreground font-medium mb-1">💡 Devi caricare le foto da un altro dispositivo?</p>
                  <p className="text-sm text-muted-foreground">Salva come bozza e potrai aggiungere le foto in seguito.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
          </Button>
          <div className="flex gap-3">
            {step === STEPS.length - 1 && (
              <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft || submitting} className="gap-2">
                <Save className="h-4 w-4" /> {savingDraft ? 'Salvataggio...' : 'Salva Bozza'}
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}>
                Avanti <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting || savingDraft} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Check className="h-4 w-4" /> {submitting ? 'Invio in corso...' : 'Invia Misurazione'}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
