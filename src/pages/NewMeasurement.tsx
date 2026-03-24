import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
import { ArrowLeft, ArrowRight, Check, Ruler, Upload, Save, Clock, Truck } from 'lucide-react';
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
  { value: 'express', label: '🚀 Express (2-3 settimane)', desc: 'Consegna rapida per misure e colori standard', surcharge: '+25%', standard_only: true },
  { value: 'standard', label: '📦 Standard (4-6 settimane)', desc: 'Tempi normali di produzione', surcharge: 'Prezzo base', standard_only: false },
  { value: 'economy', label: '📅 Programmata (8-10 settimane)', desc: 'Consegna programmata a lungo termine', surcharge: '-10%', standard_only: false },
];

const initialForm = {
  product_type: '',
  client_name: '',
  client_address: '',
  survey_type: '',
  width_mm: '',
  height_mm: '',
  depth_mm: '',
  is_square: true,
  out_of_square_mm: '',
  is_plumb: true,
  is_level: true,
  internal_space_mm: '',
  external_space_mm: '',
  num_panels: '1',
  panel_type: '',
  opening_direction: '',
  frame_type: '',
  material: '',
  color_internal: '',
  color_external: '',
  handle_type: '',
  glass_type: '',
  has_mosquito_net: false,
  has_shutter: false,
  has_box: false,
  has_motorization: false,
  installation_type: '',
  laying_type: '',
  remove_old: false,
  delivery_time: '',
  notes: '',
};

export default function NewMeasurement() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [accessoriesConfig, setAccessoriesConfig] = useState<AccessoriesConfig>({});

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

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

  const buildInsertData = (status: string, photo_urls: string[] = []) => ({
    user_id: user.id,
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
    photo_urls: photo_urls.length > 0 ? photo_urls : null,
    status,
    accessories_config: accessoriesConfig as any,
  });

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const { error } = await supabase.from('measurements').insert(buildInsertData('bozza'));
      if (error) throw error;
      toast.success(getDraftName(), { description: 'Puoi aggiungere le foto in seguito.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Errore durante il salvataggio');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let photo_urls: string[] = [];
      for (const file of photoFiles) {
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('measurement-photos').upload(fileName, file);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('measurement-photos').getPublicUrl(fileName);
          photo_urls.push(publicUrl);
        }
      }
      const { error } = await supabase.from('measurements').insert(buildInsertData('ricevuto', photo_urls));
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
    if (e.target.files) {
      setPhotoFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const showDiagram = step >= 3 && step <= 7 && !!form.product_type;

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-accent" />
            <h1 className="text-lg font-bold font-heading text-foreground">Nuova Misurazione</h1>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Passo {step + 1} di {STEPS.length}: {STEPS[step].label}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-accent transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className={`${showDiagram ? 'grid grid-cols-1 lg:grid-cols-5 gap-6' : ''}`}>
          {showDiagram && (
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-heading">Anteprima</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProductDiagram
                    productType={form.product_type}
                    widthMm={form.width_mm}
                    heightMm={form.height_mm}
                    depthMm={form.depth_mm}
                    numPanels={form.num_panels}
                    panelType={form.panel_type}
                    openingDirection={form.opening_direction}
                    handleType={form.handle_type}
                    glassType={form.glass_type}
                    frameType={form.frame_type}
                    colorInternal={form.color_internal}
                    colorExternal={form.color_external}
                    internalSpaceMm={form.internal_space_mm}
                    externalSpaceMm={form.external_space_mm}
                  />
                  <p className="text-xs text-center text-muted-foreground mt-2">Immagine a solo scopo illustrativo</p>
                </CardContent>
              </Card>
            </div>
          )}

          <div className={showDiagram ? 'lg:col-span-3' : ''}>
            <Card className="animate-fade-in">
              <CardContent className="py-6">
                {/* Step 0: Product type */}
                {step === 0 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Seleziona il prodotto</CardTitle>
                    <CardDescription>Che tipo di prodotto devi misurare?</CardDescription>
                    <RadioGroup value={form.product_type} onValueChange={v => update('product_type', v)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        { value: 'finestra', label: '🪟 Finestra' },
                        { value: 'porta_finestra', label: '🚪 Porta Finestra' },
                        { value: 'basculante', label: '🏗️ Basculante' },
                        { value: 'zanzariera', label: '🦟 Zanzariera' },
                        { value: 'persiana', label: '🪵 Persiana' },
                      ].map(opt => (
                        <Label
                          key={opt.value}
                          htmlFor={opt.value}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                            form.product_type === opt.value
                              ? 'border-accent bg-accent/10'
                              : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <RadioGroupItem value={opt.value} id={opt.value} />
                          <span className="text-lg">{opt.label}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Step 1: Client info */}
                {step === 1 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Dati cliente</CardTitle>
                    <CardDescription>A chi è destinato il prodotto?</CardDescription>
                    <div className="space-y-2">
                      <Label>Nome / Riferimento Cliente</Label>
                      <Input value={form.client_name} onChange={e => update('client_name', e.target.value)} placeholder="Mario Rossi" />
                    </div>
                    <div className="space-y-2">
                      <Label>Indirizzo installazione</Label>
                      <Input value={form.client_address} onChange={e => update('client_address', e.target.value)} placeholder="Via Roma 1, Milano" />
                    </div>
                  </div>
                )}

                {/* Step 2: Survey type */}
                {step === 2 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Tipo di rilievo</CardTitle>
                    <CardDescription>Come sono state prese le misure?</CardDescription>
                    <RadioGroup value={form.survey_type} onValueChange={v => update('survey_type', v)} className="space-y-3">
                      {[
                        { value: 'foro_muro', label: 'Foro muro (grezzo)', desc: 'Misurazione del buco nel muro' },
                        { value: 'luce_netta', label: 'Luce netta', desc: "Misurazione dell'apertura finita" },
                        { value: 'controtelaio', label: 'Controtelaio', desc: 'Misurazione del controtelaio esistente' },
                        { value: 'vecchio_infisso', label: 'Vecchio infisso', desc: "Misurazione dell'infisso da sostituire" },
                      ].map(opt => (
                        <Label
                          key={opt.value}
                          htmlFor={`survey-${opt.value}`}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all ${
                            form.survey_type === opt.value
                              ? 'border-accent bg-accent/10'
                              : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <RadioGroupItem value={opt.value} id={`survey-${opt.value}`} className="mt-0.5" />
                          <div>
                            <span className="font-medium text-foreground">{opt.label}</span>
                            <p className="text-sm text-muted-foreground">{opt.desc}</p>
                          </div>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Step 3: Dimensions */}
                {step === 3 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Misure (in mm)</CardTitle>
                    <CardDescription>Inserisci le dimensioni rilevate</CardDescription>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Larghezza (mm) *</Label>
                        <Input type="number" value={form.width_mm} onChange={e => update('width_mm', e.target.value)} placeholder="1200" />
                      </div>
                      <div className="space-y-2">
                        <Label>Altezza (mm) *</Label>
                        <Input type="number" value={form.height_mm} onChange={e => update('height_mm', e.target.value)} placeholder="1400" />
                      </div>
                      <div className="space-y-2">
                        <Label>Profondità muro (mm)</Label>
                        <Input type="number" value={form.depth_mm} onChange={e => update('depth_mm', e.target.value)} placeholder="300" />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4">
                      <Label className="text-base font-semibold">Controlli tecnici</Label>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Checkbox id="square" checked={form.is_square} onCheckedChange={v => update('is_square', v)} />
                          <Label htmlFor="square">Squadrato</Label>
                        </div>
                        {!form.is_square && (
                          <div className="ml-8 space-y-2">
                            <Label>Fuori squadro (mm)</Label>
                            <Input type="number" value={form.out_of_square_mm} onChange={e => update('out_of_square_mm', e.target.value)} placeholder="5" />
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <Checkbox id="plumb" checked={form.is_plumb} onCheckedChange={v => update('is_plumb', v)} />
                          <Label htmlFor="plumb">A piombo</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox id="level" checked={form.is_level} onCheckedChange={v => update('is_level', v)} />
                          <Label htmlFor="level">Livellato</Label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label>Spazio interno (mm)</Label>
                        <Input type="number" value={form.internal_space_mm} onChange={e => update('internal_space_mm', e.target.value)} placeholder="100" />
                      </div>
                      <div className="space-y-2">
                        <Label>Spazio esterno (mm)</Label>
                        <Input type="number" value={form.external_space_mm} onChange={e => update('external_space_mm', e.target.value)} placeholder="50" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Configuration */}
                {step === 4 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Configurazione</CardTitle>
                    <CardDescription>Definisci la configurazione dell'infisso</CardDescription>
                    <div className="space-y-2">
                      <Label>Numero ante</Label>
                      <Select value={form.num_panels} onValueChange={v => update('num_panels', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 anta</SelectItem>
                          <SelectItem value="2">2 ante</SelectItem>
                          <SelectItem value="3">3 ante</SelectItem>
                        </SelectContent>
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
                        <Label htmlFor="dir-dx" className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="destra" id="dir-dx" /> Destra
                        </Label>
                        <Label htmlFor="dir-sx" className="flex items-center gap-2 cursor-pointer">
                          <RadioGroupItem value="sinistra" id="dir-sx" /> Sinistra
                        </Label>
                      </RadioGroup>
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo telaio</Label>
                      <Select value={form.frame_type} onValueChange={v => update('frame_type', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="ridotto">Ridotto</SelectItem>
                          <SelectItem value="maggiorato">Maggiorato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Step 5: Finishes */}
                {step === 5 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Finiture</CardTitle>
                    <CardDescription>Materiale, colori e maniglie</CardDescription>
                    <div className="space-y-2">
                      <Label>Materiale</Label>
                      <RadioGroup value={form.material} onValueChange={v => update('material', v)} className="flex flex-wrap gap-3">
                        {[
                          { value: 'pvc', label: 'PVC' },
                          { value: 'alluminio', label: 'Alluminio' },
                          { value: 'legno', label: 'Legno' },
                        ].map(opt => (
                          <Label
                            key={opt.value}
                            htmlFor={`mat-${opt.value}`}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all ${
                              form.material === opt.value ? 'border-accent bg-accent/10' : 'border-border'
                            }`}
                          >
                            <RadioGroupItem value={opt.value} id={`mat-${opt.value}`} />
                            {opt.label}
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
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="design">Design</SelectItem>
                          <SelectItem value="con_chiave">Con chiave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Step 6: Glass */}
                {step === 6 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Vetro</CardTitle>
                    <CardDescription>Seleziona la tipologia di vetro</CardDescription>
                    <RadioGroup value={form.glass_type} onValueChange={v => update('glass_type', v)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        { value: 'doppio', label: 'Doppio vetro' },
                        { value: 'triplo', label: 'Triplo vetro' },
                        { value: 'basso_emissivo', label: 'Basso emissivo' },
                        { value: 'antisfondamento', label: 'Antisfondamento' },
                        { value: 'satinato', label: 'Satinato' },
                        { value: 'selettivo', label: 'Selettivo' },
                      ].map(opt => (
                        <Label
                          key={opt.value}
                          htmlFor={`glass-${opt.value}`}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
                            form.glass_type === opt.value ? 'border-accent bg-accent/10' : 'border-border'
                          }`}
                        >
                          <RadioGroupItem value={opt.value} id={`glass-${opt.value}`} />
                          {opt.label}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Step 7: Accessories */}
                {step === 7 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Accessori</CardTitle>
                    <CardDescription>Seleziona gli accessori e configurali</CardDescription>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="has_mosquito_net" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.has_mosquito_net ? 'border-accent bg-accent/10' : 'border-border'}`}>
                          <Checkbox id="has_mosquito_net" checked={form.has_mosquito_net} onCheckedChange={v => update('has_mosquito_net', v)} />
                          <span className="text-lg">🦟 Zanzariera</span>
                        </Label>
                        {form.has_mosquito_net && <AccessoryConfig type="mosquito_net" config={accessoriesConfig} onChange={setAccessoriesConfig} />}
                      </div>
                      <div>
                        <Label htmlFor="has_shutter" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.has_shutter ? 'border-accent bg-accent/10' : 'border-border'}`}>
                          <Checkbox id="has_shutter" checked={form.has_shutter} onCheckedChange={v => update('has_shutter', v)} />
                          <span className="text-lg">🪟 Tapparella</span>
                        </Label>
                        {form.has_shutter && <AccessoryConfig type="shutter" config={accessoriesConfig} onChange={setAccessoriesConfig} />}
                      </div>
                      <div>
                        <Label htmlFor="has_box" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.has_box ? 'border-accent bg-accent/10' : 'border-border'}`}>
                          <Checkbox id="has_box" checked={form.has_box} onCheckedChange={v => update('has_box', v)} />
                          <span className="text-lg">📦 Cassonetto</span>
                        </Label>
                        {form.has_box && <AccessoryConfig type="box" config={accessoriesConfig} onChange={setAccessoriesConfig} />}
                      </div>
                      <div>
                        <Label htmlFor="has_motorization" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.has_motorization ? 'border-accent bg-accent/10' : 'border-border'}`}>
                          <Checkbox id="has_motorization" checked={form.has_motorization} onCheckedChange={v => update('has_motorization', v)} />
                          <span className="text-lg">⚡ Motorizzazione</span>
                        </Label>
                        {form.has_motorization && <AccessoryConfig type="motorization" config={accessoriesConfig} onChange={setAccessoriesConfig} />}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 8: Installation + Delivery */}
                {step === 8 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Installazione</CardTitle>
                    <CardDescription>Dettagli sulla posa in opera e tempi di consegna</CardDescription>
                    <div className="space-y-2">
                      <Label>Tipo fornitura</Label>
                      <RadioGroup value={form.installation_type} onValueChange={v => update('installation_type', v)} className="space-y-3">
                        <Label htmlFor="inst-fornitura" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.installation_type === 'solo_fornitura' ? 'border-accent bg-accent/10' : 'border-border'}`}>
                          <RadioGroupItem value="solo_fornitura" id="inst-fornitura" />
                          Solo fornitura
                        </Label>
                        <Label htmlFor="inst-installazione" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.installation_type === 'con_installazione' ? 'border-accent bg-accent/10' : 'border-border'}`}>
                          <RadioGroupItem value="con_installazione" id="inst-installazione" />
                          Con installazione
                        </Label>
                      </RadioGroup>
                    </div>
                    {form.installation_type === 'con_installazione' && (
                      <>
                        <div className="space-y-2">
                          <Label>Tipo posa</Label>
                          <RadioGroup value={form.laying_type} onValueChange={v => update('laying_type', v)} className="flex gap-4">
                            <Label htmlFor="lay-std" className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="standard" id="lay-std" /> Standard
                            </Label>
                            <Label htmlFor="lay-cert" className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="certificata" id="lay-cert" /> Certificata
                            </Label>
                          </RadioGroup>
                        </div>
                        <div className="flex items-center gap-3">
                          <Checkbox id="remove-old" checked={form.remove_old} onCheckedChange={v => update('remove_old', v)} />
                          <Label htmlFor="remove-old">Rimozione vecchio infisso</Label>
                        </div>
                      </>
                    )}

                    {/* Delivery timing */}
                    <div className="space-y-3 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-accent" />
                        <Label className="text-base font-semibold">Tempi di consegna / installazione</Label>
                      </div>
                      <RadioGroup value={form.delivery_time} onValueChange={v => update('delivery_time', v)} className="space-y-3">
                        {DELIVERY_OPTIONS.map(opt => (
                          <Label
                            key={opt.value}
                            htmlFor={`del-${opt.value}`}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all ${
                              form.delivery_time === opt.value ? 'border-accent bg-accent/10' : 'border-border'
                            }`}
                          >
                            <RadioGroupItem value={opt.value} id={`del-${opt.value}`} className="mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-foreground">{opt.label}</span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  opt.value === 'express' ? 'bg-destructive/10 text-destructive' :
                                  opt.value === 'economy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {opt.surcharge}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{opt.desc}</p>
                              {opt.standard_only && (
                                <p className="text-xs text-accent mt-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Disponibile solo per misure e colori standard
                                </p>
                              )}
                            </div>
                          </Label>
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                )}

                {/* Step 9: Notes & Photos */}
                {step === 9 && (
                  <div className="space-y-4">
                    <CardTitle className="font-heading">Note e Foto</CardTitle>
                    <CardDescription>Aggiungi note tecniche e foto del rilievo</CardDescription>
                    <div className="space-y-2">
                      <Label>Note tecniche</Label>
                      <Textarea
                        value={form.notes}
                        onChange={e => update('notes', e.target.value)}
                        placeholder="Eventuali problematiche, dettagli aggiuntivi, richieste particolari..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Foto del rilievo</Label>
                      <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">Carica foto esterna, interna, dettagli misure</p>
                        <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" id="photo-upload" />
                        <Button variant="outline" asChild>
                          <label htmlFor="photo-upload" className="cursor-pointer">Seleziona foto</label>
                        </Button>
                      </div>
                      {photoFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {photoFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-md bg-muted px-3 py-1 text-sm">
                              📷 {f.name}
                              <button onClick={() => setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                      <p className="text-sm text-foreground font-medium mb-1">💡 Devi caricare le foto da un altro dispositivo?</p>
                      <p className="text-sm text-muted-foreground">
                        Salva come bozza e potrai aggiungere le foto in seguito dal telefono o da un altro computer.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
          </Button>
          <div className="flex gap-3">
            {step === STEPS.length - 1 && (
              <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft || submitting} className="gap-2">
                <Save className="h-4 w-4" />
                {savingDraft ? 'Salvataggio...' : 'Salva Bozza'}
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}>
                Avanti <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting || savingDraft} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Check className="h-4 w-4" />
                {submitting ? 'Invio in corso...' : 'Invia Misurazione'}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
