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
import { ArrowLeft, ArrowRight, Check, Ruler, Upload, Save, Clock, Truck, ZoomIn, ZoomOut, Copy, Plus, Trash2, Info, Leaf } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ProductDiagram, { COLOR_OPTIONS } from '@/components/ProductDiagram';
import AccessoryConfig, { type AccessoriesConfig } from '@/components/AccessoryConfig';
import { Switch } from '@/components/ui/switch';
import { DOOR_MODELS, getDoorModel, getCompatibleFrames, getCompatibleHandleModels, getCompatibleHandleFinishes, getHandleFinishHex, getColorsByFinish, ALL_FRAMES, ALL_HANDLE_MODELS, ALL_HANDLE_FINISHES, getModelsForProductType, isDoorType, type DoorColor } from '@/data/doorCatalog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

interface ProductItem {
  width_mm: string;
  height_mm: string;
  depth_mm: string;
  is_square: boolean;
  out_of_square_mm: string;
  is_plumb: boolean;
  is_level: boolean;
  internal_space_mm: string;
  external_space_mm: string;
  notes: string;
}

const emptyItem: ProductItem = {
  width_mm: '', height_mm: '', depth_mm: '',
  is_square: true, out_of_square_mm: '',
  is_plumb: true, is_level: true,
  internal_space_mm: '', external_space_mm: '',
  notes: '',
};

const initialForm = {
  product_type: '',
  door_model: '',
  door_color_id: '',
  door_finish_type: '',
  door_frame_id: '',
  door_handle_model_id: '',
  door_handle_finish_id: '',
  door_special_variant: '',
  door_is_window_version: false,
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
  delivery_date: '',
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
  const [diagramZoom, setDiagramZoom] = useState(100);
  const [zoomExternal, setZoomExternal] = useState(100);
  const [zoomInternal, setZoomInternal] = useState(100);

  // Multi-product state
  const [isMultiProduct, setIsMultiProduct] = useState(false);
  const [multiItems, setMultiItems] = useState<ProductItem[]>([{ ...emptyItem }]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const updateItem = (index: number, key: keyof ProductItem, value: any) => {
    setMultiItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));
  };

  const addItem = () => {
    setMultiItems(prev => [...prev, { ...emptyItem }]);
    setActiveItemIndex(multiItems.length);
  };

  const removeItem = (index: number) => {
    if (multiItems.length <= 1) return;
    setMultiItems(prev => prev.filter((_, i) => i !== index));
    if (activeItemIndex >= multiItems.length - 1) setActiveItemIndex(Math.max(0, multiItems.length - 2));
  };

  const duplicateItem = (index: number) => {
    setMultiItems(prev => [...prev.slice(0, index + 1), { ...prev[index] }, ...prev.slice(index + 1)]);
    setActiveItemIndex(index + 1);
  };

  // For single product, use form; for multi, use activeItem
  const activeItem = isMultiProduct ? multiItems[activeItemIndex] : null;
  const currentWidth = isMultiProduct ? (activeItem?.width_mm || '') : form.width_mm;
  const currentHeight = isMultiProduct ? (activeItem?.height_mm || '') : form.height_mm;

  const isStandaloneAccessory = form.product_type === 'battiscopa' || form.product_type === 'maniglia';
  const isSingleLeafDoor = isDoorType(form.product_type);
  const noHandleMode = ((accessoriesConfig as any).no_handle_mode || 'none') as 'none' | 'foro_maniglia' | 'foro_chiave' | 'foro_maniglia_chiave';
  const hasNoHandleSelection = noHandleMode !== 'none';

  const normalizeOpeningDirectionForDb = (value: string): 'destra' | 'sinistra' | null => {
    if (!value) return null;
    if (value.includes('destra')) return 'destra';
    if (value.includes('sinistra')) return 'sinistra';
    if (value === 'destra' || value === 'sinistra') return value;
    return null;
  };

  // Steps to skip for standalone accessories (battiscopa/maniglia)
  // They only need: product(0), client(1), survey(2) → then jump to notes(9)
  // For maniglia, we show config step(4) for handle selection
  const getStepsForProduct = () => {
    if (form.product_type === 'battiscopa') return [0, 1, 2, 7, 9];
    if (form.product_type === 'maniglia') return [0, 1, 2, 4, 5, 9];
    // Skip glass step (6) for porta (standard door - always cieca)
    if (form.product_type === 'porta') return STEPS.map((_, i) => i).filter(i => i !== 6);
    return STEPS.map((_, i) => i);
  };

  const activeSteps = getStepsForProduct();

  const goNextStep = () => {
    const currentIdx = activeSteps.indexOf(step);
    if (currentIdx < activeSteps.length - 1) {
      setStep(activeSteps[currentIdx + 1]);
    }
  };

  const goPrevStep = () => {
    const currentIdx = activeSteps.indexOf(step);
    if (currentIdx > 0) {
      setStep(activeSteps[currentIdx - 1]);
    }
  };

  const isFirstStep = activeSteps.indexOf(step) === 0;
  const isLastStep = activeSteps.indexOf(step) === activeSteps.length - 1;
  const currentStepIndex = activeSteps.indexOf(step);

  const canGoNext = (): boolean => {
    switch (step) {
      case 0: return !!form.product_type;
      case 1: return !!form.client_name;
      case 2: return !!form.survey_type;
      case 3:
        if (isMultiProduct) {
          return multiItems.every(item => !!item.width_mm && !!item.height_mm);
        }
        return !!form.width_mm && !!form.height_mm;
      default: return true;
    }
  };

  const getDraftName = () => {
    const parts = [];
    if (form.client_address) parts.push(form.client_address);
    if (form.client_name) parts.push(form.client_name);
    const suffix = isMultiProduct ? ` (${multiItems.length} prodotti)` : '';
    return parts.length > 0 ? `${parts.join('; ')} - Bozza Salvata${suffix}` : `Bozza Salvata${suffix}`;
  };

  const getEstimatedPrice = (widthStr?: string, heightStr?: string) => {
    const basePrices: Record<string, [number, number]> = {
      finestra: [280, 650], porta_finestra: [450, 950], porta: [350, 1200],
      basculante: [400, 900], zanzariera: [80, 250], persiana: [200, 500],
      porta_finestrata: [400, 1400], porta_filomuro: [500, 1500],
      battiscopa: [5, 25], maniglia: [30, 250],
    };
    const [min, max] = basePrices[form.product_type] || [200, 600];
    const width = parseInt(widthStr || form.width_mm) || 1000;
    const height = parseInt(heightStr || form.height_mm) || 1000;
    const sizeFactor = (width * height) / 1000000;
    const materialMult = form.material === 'alluminio' ? 1.3 : form.material === 'legno' ? 1.5 : 1;
    const glassMult = form.glass_type === 'triplo_vetro' ? 1.25 : form.glass_type === 'sicurezza' ? 1.35 : 1;
    const base = min + (max - min) * Math.min(sizeFactor, 2) / 2;
    return Math.round(base * materialMult * glassMult * 100) / 100;
  };

  const buildInsertData = (status: string, photo_urls: string[] = [], itemOverrides?: Partial<ProductItem>, groupId?: string, itemIndex?: number, totalItems?: number) => ({
    user_id: user.id,
    product_type: form.product_type,
    client_name: form.client_name,
    client_address: form.client_address,
    survey_type: form.survey_type || 'foro_muro',
    width_mm: parseInt(itemOverrides?.width_mm || form.width_mm) || 0,
    height_mm: parseInt(itemOverrides?.height_mm || form.height_mm) || 0,
    depth_mm: (itemOverrides?.depth_mm || form.depth_mm) ? parseInt(itemOverrides?.depth_mm || form.depth_mm) : null,
    is_square: itemOverrides?.is_square ?? form.is_square,
    out_of_square_mm: (itemOverrides?.out_of_square_mm || form.out_of_square_mm) ? parseInt(itemOverrides?.out_of_square_mm || form.out_of_square_mm) : null,
    is_plumb: itemOverrides?.is_plumb ?? form.is_plumb,
    is_level: itemOverrides?.is_level ?? form.is_level,
    internal_space_mm: (itemOverrides?.internal_space_mm || form.internal_space_mm) ? parseInt(itemOverrides?.internal_space_mm || form.internal_space_mm) : null,
    external_space_mm: (itemOverrides?.external_space_mm || form.external_space_mm) ? parseInt(itemOverrides?.external_space_mm || form.external_space_mm) : null,
    num_panels: isSingleLeafDoor ? 1 : (parseInt(form.num_panels) || 1),
    panel_type: form.panel_type || null,
    opening_direction: normalizeOpeningDirectionForDb(form.opening_direction),
    frame_type: form.frame_type || null,
    material: form.material || null,
    color_internal: form.color_internal || null,
    color_external: form.color_external || null,
    handle_type: hasNoHandleSelection ? null : (form.handle_type || null),
    glass_type: form.product_type === 'porta' ? 'cieca' : (form.glass_type || null),
    has_mosquito_net: form.has_mosquito_net,
    has_shutter: form.has_shutter,
    has_box: form.has_box,
    has_motorization: form.has_motorization,
    installation_type: form.installation_type || null,
    laying_type: form.laying_type || null,
    remove_old: form.remove_old,
    notes: (itemOverrides?.notes ? `${itemOverrides.notes}\n` : '') + (form.notes || ''),
    photo_urls: photo_urls.length > 0 ? photo_urls : null,
    status,
    accessories_config: {
      ...accessoriesConfig,
      ...(isDoorType(form.product_type) ? {
        door_model: form.door_model,
        door_model_name: getDoorModel(form.door_model)?.name || '',
        door_handle_model_id: hasNoHandleSelection ? '' : form.door_handle_model_id,
        door_handle_finish_id: hasNoHandleSelection ? '' : form.door_handle_finish_id,
        door_color_id: form.door_color_id,
        door_color_name: getDoorModel(form.door_model)?.colors.find(c => c.id === form.door_color_id)?.name || '',
        door_frame_id: form.door_frame_id,
        door_special_variant: form.door_special_variant,
        no_handle_mode: noHandleMode,
      } : {}),
    } as any,
    estimated_price: status !== 'bozza' ? getEstimatedPrice(itemOverrides?.width_mm, itemOverrides?.height_mm) : null,
    order_group_id: groupId || null,
    order_item_index: itemIndex ?? null,
    order_total_items: totalItems ?? null,
  } as any);

  const createAccessoryRecords = async (status: string) => {
    const accessoryMap = [
      { flag: form.has_mosquito_net, type: 'zanzariera', config: { mosquito_type: accessoriesConfig.mosquito_type, mosquito_color: accessoriesConfig.mosquito_color } },
      { flag: form.has_shutter, type: 'persiana', config: { shutter_color: accessoriesConfig.shutter_color, shutter_operation: accessoriesConfig.shutter_operation } },
    ];
    for (const acc of accessoryMap) {
      if (!acc.flag) continue;
      await supabase.from('measurements').insert({
        user_id: user.id,
        product_type: acc.type,
        client_name: form.client_name,
        client_address: form.client_address,
        survey_type: form.survey_type || 'foro_muro',
        width_mm: parseInt(form.width_mm) || 0,
        height_mm: parseInt(form.height_mm) || 0,
        status,
        accessories_config: acc.config as any,
        notes: `Accessorio di ${form.product_type} - ${form.client_name}`,
      });
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      if (isMultiProduct) {
        const groupId = crypto.randomUUID();
        for (let i = 0; i < multiItems.length; i++) {
          const { error } = await supabase.from('measurements').insert(
            buildInsertData('bozza', [], multiItems[i], groupId, i + 1, multiItems.length)
          );
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('measurements').insert(buildInsertData('bozza'));
        if (error) throw error;
        await createAccessoryRecords('bozza');
      }
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

      if (isMultiProduct) {
        const groupId = crypto.randomUUID();
        for (let i = 0; i < multiItems.length; i++) {
        const { error } = await supabase.from('measurements').insert(
            buildInsertData('submitted', photo_urls, multiItems[i], groupId, i + 1, multiItems.length)
          );
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from('measurements').insert(buildInsertData('submitted', photo_urls));
        if (error) throw error;
        await createAccessoryRecords('submitted');
      }

      // Send email notification
      try {
        await supabase.functions.invoke('notify-measurement', {
          body: {
            userId: user.id,
            clientName: form.client_name,
            clientAddress: form.client_address,
            productType: form.product_type,
            surveyType: form.survey_type,
            dimensions: isMultiProduct
              ? `${multiItems.length} prodotti`
              : `${form.width_mm}×${form.height_mm} mm`,
            estimatedPrice: getEstimatedPrice(),
            measurement: {
              material: form.material,
              color_internal: form.color_internal,
              color_external: form.color_external,
              glass_type: form.glass_type,
              frame_type: form.frame_type,
              handle_type: form.handle_type,
              installation_type: form.installation_type,
              laying_type: form.laying_type,
              notes: form.notes,
            },
          },
        });
      } catch (e) {
        console.log('Email notification skipped:', e);
      }

      toast.success('Preventivo inviato con successo!', { description: 'Riceverai una risposta a breve.' });
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

  const showDiagram = step >= 3 && step <= 6 && !!form.product_type && !isStandaloneAccessory;
  const showDualDiagram = step === 5 && !isStandaloneAccessory;

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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(50, z - 10))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(200, z + 10))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto" style={{ maxHeight: zoom > 100 ? '500px' : undefined }}>
          <div className="flex justify-center">
          <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            <ProductDiagram
              productType={form.product_type}
              widthMm={currentWidth}
              heightMm={currentHeight}
              depthMm={isMultiProduct ? (activeItem?.depth_mm || '') : form.depth_mm}
              numPanels={form.num_panels}
              panelType={form.panel_type}
              openingDirection={form.opening_direction}
              handleType={form.handle_type}
              glassType={form.glass_type}
              frameType={isDoorType(form.product_type) && form.door_frame_id ? form.door_frame_id : form.frame_type}
              colorInternal={form.color_internal}
              colorExternal={form.color_external}
              internalSpaceMm={isMultiProduct ? (activeItem?.internal_space_mm || '') : form.internal_space_mm}
              externalSpaceMm={isMultiProduct ? (activeItem?.external_space_mm || '') : form.external_space_mm}
              view={view}
              doorColorHex={isDoorType(form.product_type) && form.door_color_id ? (getDoorModel(form.door_model)?.colors.find(c => c.id === form.door_color_id)?.hex) : undefined}
              doorHandleFinishId={isDoorType(form.product_type) ? form.door_handle_finish_id : undefined}
              doorHandleModelId={isDoorType(form.product_type) ? form.door_handle_model_id : undefined}
              doorModelId={isDoorType(form.product_type) ? form.door_model : undefined}
              doorSpecialVariant={isDoorType(form.product_type) ? form.door_special_variant : undefined}
              hideHandle={hasNoHandleSelection}
              handleHoleMode={noHandleMode}
            />
          </div>
          </div>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">Immagine a solo scopo illustrativo</p>
      </CardContent>
    </Card>
  );

  // Render multi-product dimensions for step 3
  const renderMultiDimensions = () => (
    <div className="space-y-4">
      <CardTitle className="font-heading">Misure per {multiItems.length} prodotti</CardTitle>
      <CardDescription>
        Configurazione condivisa: stesso colore, telaio, materiale e accessori per tutti i prodotti.
        Le misure possono variare per ogni singolo prodotto.
      </CardDescription>

      {/* Item tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border">
        {multiItems.map((_, i) => (
          <Button
            key={i}
            variant={activeItemIndex === i ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveItemIndex(i)}
            className="gap-1.5"
          >
            #{i + 1}
            {multiItems[i].width_mm && multiItems[i].height_mm && (
              <span className="text-xs opacity-70">({multiItems[i].width_mm}×{multiItems[i].height_mm})</span>
            )}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={addItem} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Aggiungi
        </Button>
      </div>

      {/* Active item form */}
      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">Prodotto #{activeItemIndex + 1}</h4>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateItem(activeItemIndex)} title="Duplica">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {multiItems.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(activeItemIndex)} title="Rimuovi">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${isDoorType(form.product_type) ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <div className="space-y-2">
            <Label>Larghezza (mm) *</Label>
            <Input type="number" value={multiItems[activeItemIndex].width_mm} onChange={e => updateItem(activeItemIndex, 'width_mm', e.target.value)} placeholder="1200" />
          </div>
          <div className="space-y-2">
            <Label>Altezza (mm) *</Label>
            <Input type="number" value={multiItems[activeItemIndex].height_mm} onChange={e => updateItem(activeItemIndex, 'height_mm', e.target.value)} placeholder="1400" />
          </div>
          {!isDoorType(form.product_type) && (
            <div className="space-y-2">
              <Label>Profondità muro (mm)</Label>
              <Input type="number" value={multiItems[activeItemIndex].depth_mm} onChange={e => updateItem(activeItemIndex, 'depth_mm', e.target.value)} placeholder="300" />
            </div>
          )}
        </div>

        {!isDoorType(form.product_type) && (
          <div className="space-y-3 pt-2">
            <Label className="text-base font-semibold">Controlli tecnici</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox id={`square-${activeItemIndex}`} checked={multiItems[activeItemIndex].is_square} onCheckedChange={v => updateItem(activeItemIndex, 'is_square', v)} />
                <Label htmlFor={`square-${activeItemIndex}`}>Squadrato</Label>
              </div>
              {!multiItems[activeItemIndex].is_square && (
                <div className="ml-8 space-y-2">
                  <Label>Fuori squadro (mm)</Label>
                  <Input type="number" value={multiItems[activeItemIndex].out_of_square_mm} onChange={e => updateItem(activeItemIndex, 'out_of_square_mm', e.target.value)} placeholder="5" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <Checkbox id={`plumb-${activeItemIndex}`} checked={multiItems[activeItemIndex].is_plumb} onCheckedChange={v => updateItem(activeItemIndex, 'is_plumb', v)} />
                <Label htmlFor={`plumb-${activeItemIndex}`}>A piombo</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id={`level-${activeItemIndex}`} checked={multiItems[activeItemIndex].is_level} onCheckedChange={v => updateItem(activeItemIndex, 'is_level', v)} />
                <Label htmlFor={`level-${activeItemIndex}`}>Livellato</Label>
              </div>
            </div>
          </div>
        )}

        {!isDoorType(form.product_type) && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Spazio interno (mm)</Label>
              <Input type="number" value={multiItems[activeItemIndex].internal_space_mm} onChange={e => updateItem(activeItemIndex, 'internal_space_mm', e.target.value)} placeholder="100" />
            </div>
            <div className="space-y-2">
              <Label>Spazio esterno (mm)</Label>
              <Input type="number" value={multiItems[activeItemIndex].external_space_mm} onChange={e => updateItem(activeItemIndex, 'external_space_mm', e.target.value)} placeholder="50" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Note specifiche per questo prodotto</Label>
          <Input value={multiItems[activeItemIndex].notes} onChange={e => updateItem(activeItemIndex, 'notes', e.target.value)} placeholder="Es. finestra bagno piano 1..." />
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-muted/30 border border-border p-3">
        <p className="text-sm font-medium text-foreground mb-2">Riepilogo prodotti ({multiItems.length})</p>
        <div className="space-y-1">
          {multiItems.map((item, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs ${i === activeItemIndex ? 'text-accent font-medium' : 'text-muted-foreground'}`}>
              <span>#{i + 1}</span>
              {item.width_mm && item.height_mm ? (
                <span>{item.width_mm}×{item.height_mm} mm</span>
              ) : (
                <span className="italic">Misure da inserire</span>
              )}
              {item.notes && <span className="truncate max-w-[200px]">— {item.notes}</span>}
            </div>
          ))}
        </div>
      </div>
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
            <h1 className="text-lg font-bold font-heading text-foreground">
              Nuova Misurazione{isMultiProduct ? ` (${multiItems.length} prodotti)` : ''}
            </h1>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Passo {currentStepIndex + 1} di {activeSteps.length}: {STEPS[step].label}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round(((currentStepIndex + 1) / activeSteps.length) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full gradient-accent transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / activeSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Single diagram ABOVE the form */}
        {showDiagram && !showDualDiagram && (
          <div className="mb-6">
            <DiagramWithZoom zoom={diagramZoom} setZoom={setDiagramZoom} />
          </div>
        )}

        {/* Dual diagram for finishes step */}
        {showDualDiagram && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DiagramWithZoom view="external" zoom={zoomExternal} setZoom={setZoomExternal} />
            <DiagramWithZoom view="internal" zoom={zoomInternal} setZoom={setZoomInternal} />
          </div>
        )}

        <Card className="animate-fade-in">
          <CardContent className="py-6">
            {/* Step 0: Product type */}
            {step === 0 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Seleziona il prodotto</CardTitle>
                <CardDescription>Che tipo di prodotto devi misurare?</CardDescription>
                <RadioGroup value={form.product_type} onValueChange={v => { update('product_type', v); update('door_model', ''); update('door_color_id', ''); update('door_finish_type', ''); update('door_frame_id', ''); update('door_handle_model_id', ''); update('door_handle_finish_id', ''); update('door_special_variant', ''); update('glass_type', ''); setAccessoriesConfig({}); }} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    { value: 'finestra', label: '🪟 Finestra' },
                    { value: 'porta', label: '🚪 Porta' },
                    { value: 'porta_finestrata', label: '🚪🪟 Porta Finestrata' },
                    { value: 'porta_filomuro', label: '🚪 Porta Filomuro' },
                    { value: 'porta_finestra', label: '🏠 Porta Finestra' },
                    { value: 'basculante', label: '🏗️ Basculante' },
                    { value: 'zanzariera', label: '🦟 Zanzariera' },
                    { value: 'persiana', label: '🪵 Persiana' },
                    { value: 'battiscopa', label: '🪵 Battiscopa' },
                    { value: 'maniglia', label: '🔩 Maniglia' },
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

                {/* Door model selection when porta is selected */}
                {isDoorType(form.product_type) && (
                  <div className="mt-6 space-y-4">
                    <div className="border-t border-border pt-4">
                      <Label className="text-base font-semibold">🏷️ Seleziona modello {form.product_type === 'porta_finestrata' ? 'porta finestrata' : form.product_type === 'porta_filomuro' ? 'porta filomuro' : 'porta'}</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {form.product_type === 'porta_finestrata' ? 'Porte con inserto vetro/finestra' : form.product_type === 'porta_filomuro' ? 'Porte con telaio a scomparsa (A Filo / Concept)' : 'Scegli il modello dal catalogo per accedere a colori, telai e maniglie specifici'}
                      </p>
                    </div>
                    {(() => {
                      // Group models by family prefix, sorted alphabetically
                       const currentModels = getModelsForProductType(form.product_type);
                      const familyMap = new Map<string, typeof currentModels>();
                      const sortedModels = [...currentModels].sort((a, b) => a.name.localeCompare(b.name));
                      sortedModels.forEach(model => {
                        const family = model.name.split(/[\s\/]/)[0]; // e.g. "Yncisa", "Equa", "Suite"
                        if (!familyMap.has(family)) familyMap.set(family, []);
                        familyMap.get(family)!.push(model);
                      });
                      const families = [...familyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
                      // Find which family the selected model belongs to
                      const selectedFamily = form.door_model ? sortedModels.find(m => m.id === form.door_model)?.name.split(/[\s\/]/)[0] : null;

                      return (
                        <Accordion type="single" collapsible value={selectedFamily || undefined} className="space-y-2">
                          {families.map(([family, models]) => (
                            <AccordionItem key={family} value={family} className="border rounded-lg overflow-hidden">
                              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">{family}</span>
                                  <span className="text-xs text-muted-foreground">({models.length} {models.length === 1 ? 'modello' : 'modelli'})</span>
                                  {models.some(m => m.id === form.door_model) && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">✓ Selezionato</span>
                                  )}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-2 pb-2">
                                <RadioGroup value={form.door_model} onValueChange={v => { update('door_model', v); update('door_color_id', ''); update('door_finish_type', ''); update('door_frame_id', ''); update('door_handle_model_id', ''); update('door_handle_finish_id', ''); update('door_special_variant', ''); }} className="space-y-2">
                                  {models.map(model => (
                                    <Label
                                      key={model.id}
                                      htmlFor={`model-${model.id}`}
                                      className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-all ${
                                        form.door_model === model.id ? 'border-accent bg-accent/10' : 'border-border hover:border-muted-foreground/30'
                                      }`}
                                    >
                                      <RadioGroupItem value={model.id} id={`model-${model.id}`} className="mt-1" />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-foreground">{model.name}</span>
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{model.collection}</span>
                                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
                                            <Leaf className="h-3 w-3" /> GREEN
                                          </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                          <span>📐 {model.minWidth}–{model.maxWidth} × {model.minHeight}–{model.maxHeight} mm</span>
                                          <span>🎨 {model.colors.length} colori</span>
                                          <span>🖼️ {model.compatibleFrameIds.length} telai</span>
                                        </div>
                                      </div>
                                    </Label>
                                  ))}
                                </RadioGroup>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      );
                    })()}

                    {/* Selected model details */}
                    {form.door_model && (() => {
                      const model = getDoorModel(form.door_model);
                      if (!model) return null;
                      return (
                        <div className="space-y-3">
                          {/* Special variants */}
                          {model.specialVariants.length > 0 && (
                            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                              <Label className="text-sm font-semibold">✨ Soluzioni speciali (opzionale)</Label>
                              <RadioGroup value={form.door_special_variant} onValueChange={v => update('door_special_variant', v === form.door_special_variant ? '' : v)} className="space-y-2">
                                <Label
                                  htmlFor="variant-none"
                                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-all ${
                                    !form.door_special_variant ? 'border-accent bg-accent/10' : 'border-border'
                                  }`}
                                >
                                  <RadioGroupItem value="" id="variant-none" />
                                  <span>Standard (nessuna soluzione speciale)</span>
                                </Label>
                                {model.specialVariants.map(v => (
                                  <Label
                                    key={v.id}
                                    htmlFor={`variant-${v.id}`}
                                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-all ${
                                      form.door_special_variant === v.id ? 'border-accent bg-accent/10' : 'border-border'
                                    }`}
                                  >
                                    <RadioGroupItem value={v.id} id={`variant-${v.id}`} className="mt-0.5" />
                                    <div>
                                      <span className="font-medium">{v.name}</span>
                                      <p className="text-xs text-muted-foreground mt-0.5">{v.description}</p>
                                    </div>
                                  </Label>
                                ))}
                              </RadioGroup>
                            </div>
                          )}




                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Multi-product toggle */}
                {form.product_type && (
                  <div className="mt-6 rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground text-sm">📦 Ordine multi-prodotto</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ad es. 5 finestre: stesso colore, telaio, materiale per tutti. Solo le misure variano per ogni prodotto.
                        </p>
                      </div>
                      <Switch
                        checked={isMultiProduct}
                        onCheckedChange={(checked) => {
                          setIsMultiProduct(checked);
                          if (checked && multiItems.length === 1 && !multiItems[0].width_mm) {
                            // Keep single item
                          } else if (!checked) {
                            setMultiItems([{ ...emptyItem }]);
                            setActiveItemIndex(0);
                          }
                        }}
                      />
                    </div>
                    {isMultiProduct && (
                      <div className="pt-2 border-t border-border">
                        <Label className="text-xs">Quanti prodotti? (puoi aggiungerne altri dopo)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            min={2}
                            max={20}
                            className="w-20"
                            value={multiItems.length}
                            onChange={e => {
                              const count = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                              setMultiItems(prev => {
                                if (count > prev.length) {
                                  return [...prev, ...Array(count - prev.length).fill(null).map(() => ({ ...emptyItem }))];
                                }
                                return prev.slice(0, count);
                              });
                              if (activeItemIndex >= count) setActiveItemIndex(0);
                            }}
                          />
                          <span className="text-sm text-muted-foreground">prodotti</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
              isMultiProduct ? renderMultiDimensions() : (
                <div className="space-y-4">
                  <CardTitle className="font-heading">Misure (in mm)</CardTitle>
                  <CardDescription>Inserisci le dimensioni rilevate</CardDescription>
                  {/* Door model dimension limits */}
                  {isDoorType(form.product_type) && form.door_model && (() => {
                    const model = getDoorModel(form.door_model);
                    if (!model) return null;
                    return (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-start gap-2">
                        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-foreground">{model.name} — Dimensioni ammesse</p>
                          <p className="text-muted-foreground">
                            Larghezza: {model.minWidth}–{model.maxWidth} mm &nbsp;|&nbsp; Altezza: {model.minHeight}–{model.maxHeight} mm
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className={`grid grid-cols-1 gap-4 ${isDoorType(form.product_type) ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
                    <div className="space-y-2">
                      <Label>Larghezza (mm) *</Label>
                      <Input type="number" value={form.width_mm} onChange={e => update('width_mm', e.target.value)} placeholder="1200" />
                    </div>
                    <div className="space-y-2">
                      <Label>Altezza (mm) *</Label>
                      <Input type="number" value={form.height_mm} onChange={e => update('height_mm', e.target.value)} placeholder="1400" />
                    </div>
                    {!isDoorType(form.product_type) && (
                      <div className="space-y-2">
                        <Label>Profondità muro (mm)</Label>
                        <Input type="number" value={form.depth_mm} onChange={e => update('depth_mm', e.target.value)} placeholder="300" />
                      </div>
                    )}
                  </div>

                  {!isDoorType(form.product_type) && (
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
                  )}

                  {!isDoorType(form.product_type) && (
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
                  )}
                </div>
              )
            )}

            {/* Step 4: Configuration */}
            {step === 4 && form.product_type === 'maniglia' ? (
              <div className="space-y-4">
                <CardTitle className="font-heading">Seleziona Maniglia</CardTitle>
                <CardDescription>Scegli il modello di maniglia desiderato</CardDescription>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                  {ALL_HANDLE_MODELS.map(h => (
                    <Label
                      key={h.id}
                      htmlFor={`mh-${h.id}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                        form.door_handle_model_id === h.id ? 'border-accent bg-accent/10' : 'border-border'
                      }`}
                    >
                      <RadioGroupItem value={h.id} id={`mh-${h.id}`} checked={form.door_handle_model_id === h.id} onClick={() => update('door_handle_model_id', h.id)} />
                      <div>
                        <span className="font-medium text-sm">{h.name}</span>
                        {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                      </div>
                    </Label>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Quantità</Label>
                  <Input type="number" placeholder="1" min="1" value={(form as any).maniglia_qty || '1'} onChange={e => update('maniglia_qty' as any, e.target.value)} />
                </div>
              </div>
            ) : step === 4 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Configurazione</CardTitle>
                <CardDescription>
                  {isMultiProduct
                    ? `Configurazione condivisa per tutti i ${multiItems.length} prodotti`
                    : "Definisci la configurazione dell'infisso"}
                </CardDescription>
                {!isSingleLeafDoor && <div className="space-y-2">
                  <Label>Numero ante</Label>
                  <Select value={form.num_panels} onValueChange={v => update('num_panels', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 anta</SelectItem>
                      <SelectItem value="2">2 ante</SelectItem>
                      <SelectItem value="3">3 ante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>}
                <div className="space-y-2">
                  <Label>Tipologia apertura</Label>
                  {isDoorType(form.product_type) && form.door_model ? (
                    <Select value={form.panel_type} onValueChange={v => update('panel_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                      <SelectContent>
                        {(getDoorModel(form.door_model)?.openingTypes || []).map(t => (
                          <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={form.panel_type} onValueChange={v => update('panel_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="battente">Battente</SelectItem>
                        <SelectItem value="anta_ribalta">Anta-Ribalta</SelectItem>
                        <SelectItem value="vasistas">Vasistas</SelectItem>
                        <SelectItem value="scorrevole">Scorrevole</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Senso di apertura</Label>
                  <RadioGroup value={form.opening_direction} onValueChange={v => update('opening_direction', v)} className="grid grid-cols-2 gap-2">
                    <Label htmlFor="dir-sp-dx" className="flex items-center gap-2 cursor-pointer text-sm">
                      <RadioGroupItem value="spingere_destra" id="dir-sp-dx" /> Spingere destra
                    </Label>
                    <Label htmlFor="dir-sp-sx" className="flex items-center gap-2 cursor-pointer text-sm">
                      <RadioGroupItem value="spingere_sinistra" id="dir-sp-sx" /> Spingere sinistra
                    </Label>
                    <Label htmlFor="dir-ti-dx" className="flex items-center gap-2 cursor-pointer text-sm">
                      <RadioGroupItem value="tirare_destra" id="dir-ti-dx" /> Tirare destra
                    </Label>
                    <Label htmlFor="dir-ti-sx" className="flex items-center gap-2 cursor-pointer text-sm">
                      <RadioGroupItem value="tirare_sinistra" id="dir-ti-sx" /> Tirare sinistra
                    </Label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Tipo telaio</Label>
                  {isDoorType(form.product_type) && form.door_model ? (
                    <>
                      <Select value={form.door_frame_id} onValueChange={v => { update('door_frame_id', v); update('frame_type', v); }}>
                        <SelectTrigger><SelectValue placeholder="Seleziona telaio..." /></SelectTrigger>
                        <SelectContent>
                          {getCompatibleFrames(form.door_model).map(f => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.door_frame_id && (() => {
                        const frame = getCompatibleFrames(form.door_model).find(f => f.id === form.door_frame_id);
                        return frame?.description ? (
                          <p className="text-xs text-muted-foreground mt-1">{frame.description}</p>
                        ) : null;
                      })()}
                    </>
                  ) : (
                    <Select value={form.frame_type} onValueChange={v => update('frame_type', v)}>
                      <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="ridotto">Ridotto</SelectItem>
                        <SelectItem value="maggiorato">Maggiorato</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {isMultiProduct && (
                  <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 mt-2">
                    <p className="text-xs text-accent flex items-center gap-1.5">
                      <Copy className="h-3.5 w-3.5" />
                      Questa configurazione verrà applicata a tutti i {multiItems.length} prodotti dell'ordine
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Finishes */}
            {step === 5 && form.product_type === 'maniglia' ? (
              <div className="space-y-4">
                <CardTitle className="font-heading">Finitura Maniglia</CardTitle>
                <CardDescription>Scegli la finitura per la maniglia selezionata</CardDescription>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_HANDLE_FINISHES.map(f => (
                    <Label
                      key={f.id}
                      htmlFor={`mhf-${f.id}`}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all ${
                        form.door_handle_finish_id === f.id ? 'border-accent bg-accent/10' : 'border-border'
                      }`}
                    >
                      <RadioGroupItem value={f.id} id={`mhf-${f.id}`} checked={form.door_handle_finish_id === f.id} onClick={() => update('door_handle_finish_id', f.id)} />
                      <div className="w-5 h-5 rounded-full border border-border shrink-0" style={{ backgroundColor: f.hex }} />
                      <span className="text-sm">{f.name}</span>
                    </Label>
                  ))}
                </div>
              </div>
            ) : step === 5 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Finiture</CardTitle>
                <CardDescription>
                  {isMultiProduct
                    ? `Finiture condivise per tutti i ${multiItems.length} prodotti`
                    : isDoorType(form.product_type) && form.door_model
                      ? `Colori e maniglie per ${getDoorModel(form.door_model)?.name || 'porta'}`
                      : 'Materiale, colori e maniglie'}
                </CardDescription>

                {/* Material - only for non-catalog doors */}
                {!(isDoorType(form.product_type) && form.door_model) && (
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
                )}

                {/* Door catalog colors */}
                {isDoorType(form.product_type) && form.door_model ? (() => {
                  const model = getDoorModel(form.door_model);
                  if (!model) return null;
                  const finishTypes = [...new Set(model.colors.map(c => c.finish))];
                  const filteredColors = form.door_finish_type
                    ? getColorsByFinish(model.colors, form.door_finish_type)
                    : model.colors;

                  return (
                    <div className="space-y-4">
                      {/* Finish type filter */}
                      <div className="space-y-2">
                        <Label>Finitura</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={!form.door_finish_type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => update('door_finish_type', '')}
                          >
                            Tutti ({model.colors.length})
                          </Button>
                          {finishTypes.map(ft => (
                            <Button
                              key={ft}
                              type="button"
                              variant={form.door_finish_type === ft ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => { update('door_finish_type', ft); update('door_color_id', ''); }}
                            >
                              {ft === 'laccato_opaco' ? 'Laccato Opaco' : 'Laccato ULTRA Opaco'}
                              {' '}({getColorsByFinish(model.colors, ft).length})
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Color grid */}
                      <div className="space-y-2">
                        <Label>Colore porta</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {filteredColors.map(color => (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => { update('door_color_id', color.id); update('color_internal', color.id); update('color_external', color.id); }}
                              className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all hover:shadow-md ${
                                form.door_color_id === color.id
                                  ? 'border-accent bg-accent/10 shadow-md'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <div
                                className="w-10 h-10 rounded-full border-2 border-border shadow-inner"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="text-xs text-center font-medium leading-tight">{color.name}</span>
                              {color.green && (
                                <span className="absolute top-1 right-1">
                                  <Leaf className="h-3 w-3 text-emerald-500" />
                                </span>
                              )}
                              {form.door_color_id === color.id && (
                                <div className="absolute top-1 left-1">
                                  <Check className="h-3.5 w-3.5 text-accent" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        {form.door_color_id && (() => {
                          const selectedColor = model.colors.find(c => c.id === form.door_color_id);
                          return selectedColor ? (
                            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-muted/50">
                              <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: selectedColor.hex }} />
                              <span className="text-sm font-medium">{selectedColor.name}</span>
                              <span className="text-xs text-muted-foreground">
                                — {selectedColor.finish === 'laccato_opaco' ? 'Laccato Opaco' : 'Laccato ULTRA Opaco'}
                              </span>
                              {selectedColor.green && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-0.5">
                                  <Leaf className="h-3 w-3" /> GREEN
                                </span>
                              )}
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {/* No-handle option */}
                      <div className="space-y-2">
                        <Label>Maniglia</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          {[
                            { value: 'none', label: '🔩 Con maniglia', desc: 'Seleziona modello e finitura' },
                            { value: 'foro_maniglia', label: '🕳️ Solo foro maniglia', desc: 'Senza maniglia, solo predisposizione' },
                            { value: 'foro_chiave', label: '🔑 Solo foro chiave', desc: 'Senza maniglia, solo serratura' },
                            { value: 'foro_maniglia_chiave', label: '🕳️🔑 Foro maniglia + chiave', desc: 'Predisposizione maniglia e serratura' },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setAccessoriesConfig(prev => ({ ...prev, no_handle_mode: opt.value as any }))}
                              className={`flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-sm transition-all text-left ${
                                noHandleMode === opt.value
                                  ? 'border-accent bg-accent/10'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <span className="font-medium">{opt.label}</span>
                              <span className="text-xs text-muted-foreground">{opt.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Handle model selection - only when handle is selected */}
                      {!hasNoHandleSelection && (
                      <div className="space-y-2">
                        <Label>Tipo maniglia</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {getCompatibleHandleModels(form.door_model).map(hm => (
                            <button
                              key={hm.id}
                              type="button"
                              onClick={() => update('door_handle_model_id', hm.id)}
                              className={`flex flex-col items-start gap-1 rounded-lg border-2 p-3 text-sm transition-all ${
                                form.door_handle_model_id === hm.id
                                  ? 'border-accent bg-accent/10'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <span className="font-medium">{hm.name}</span>
                              {hm.description && <span className="text-xs text-muted-foreground">{hm.description}</span>}
                              {form.door_handle_model_id === hm.id && <Check className="h-4 w-4 text-accent" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      )}

                      {/* Handle finish selection - only when handle is selected */}
                      {!hasNoHandleSelection && (
                      <div className="space-y-2">
                        <Label>Finitura maniglia</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {getCompatibleHandleFinishes(form.door_model).map(hf => (
                            <button
                              key={hf.id}
                              type="button"
                              onClick={() => { update('door_handle_finish_id', hf.id); update('handle_type', hf.id); }}
                              className={`flex items-center gap-2 rounded-lg border-2 p-3 text-sm transition-all ${
                                form.door_handle_finish_id === hf.id
                                  ? 'border-accent bg-accent/10'
                                  : 'border-border hover:border-muted-foreground/30'
                              }`}
                            >
                              <div className="w-5 h-5 rounded-full border border-border shadow-inner" style={{ backgroundColor: hf.hex }} />
                              <span className="font-medium">{hf.name}</span>
                              {form.door_handle_finish_id === hf.id && <Check className="h-4 w-4 text-accent ml-auto" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  );
                })() : (
                  <>
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
                  </>
                )}

                {isMultiProduct && (
                  <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 mt-2">
                    <p className="text-xs text-accent flex items-center gap-1.5">
                      <Copy className="h-3.5 w-3.5" />
                      Queste finiture verranno applicate a tutti i {multiItems.length} prodotti dell'ordine
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Glass */}
            {step === 6 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Vetro</CardTitle>
                <CardDescription>
                  {(form.product_type === 'porta_finestra' || isDoorType(form.product_type))
                    ? (form.product_type === 'porta_finestrata' ? 'Seleziona il tipo di vetro per la porta finestrata.' : 'La porta è cieca di default. Puoi aggiungere un vetro se desiderato.')
                    : 'Seleziona la tipologia di vetro'}
                </CardDescription>
                <RadioGroup value={form.glass_type} onValueChange={v => update('glass_type', v)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(form.product_type === 'porta_finestra' || isDoorType(form.product_type)) ? (
                    <>
                      {[
                        // Only show "porta cieca" for standard doors and filomuro, NOT for porta_finestrata
                        ...(form.product_type !== 'porta_finestrata' ? [{ value: 'cieca', label: '🚪 Porta cieca (no vetro)' }] : []),
                        { value: 'trasparente', label: '🔍 Vetro trasparente' },
                        { value: 'satinato', label: '🌫️ Vetro satinato' },
                      ].map(opt => (
                        <Label key={opt.value} htmlFor={`glass-${opt.value}`} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.glass_type === opt.value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                          <RadioGroupItem value={opt.value} id={`glass-${opt.value}`} />
                          {opt.label}
                        </Label>
                      ))}
                    </>
                  ) : (
                    <>
                      {[
                        { value: 'doppio', label: 'Doppio vetro' },
                        { value: 'triplo', label: 'Triplo vetro' },
                        { value: 'basso_emissivo', label: 'Basso emissivo' },
                        { value: 'antisfondamento', label: 'Antisfondamento' },
                        { value: 'satinato', label: 'Satinato' },
                        { value: 'selettivo', label: 'Selettivo' },
                      ].map(opt => (
                        <Label key={opt.value} htmlFor={`glass-${opt.value}`} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${form.glass_type === opt.value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                          <RadioGroupItem value={opt.value} id={`glass-${opt.value}`} />
                          {opt.label}
                        </Label>
                      ))}
                    </>
                  )}
                </RadioGroup>
              </div>
            )}

            {/* Step 7: Accessories */}
            {step === 7 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Accessori</CardTitle>
                <CardDescription>
                  {isDoorType(form.product_type)
                    ? 'Seleziona gli accessori per la porta (battiscopa, ecc.)'
                    : 'Seleziona gli accessori e configurali'}
                </CardDescription>
                {isDoorType(form.product_type) ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="has_battiscopa" className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${(accessoriesConfig as any).has_battiscopa ? 'border-accent bg-accent/10' : 'border-border'}`}>
                        <Checkbox id="has_battiscopa" checked={(accessoriesConfig as any).has_battiscopa || false} onCheckedChange={v => setAccessoriesConfig(prev => ({ ...prev, has_battiscopa: v }))} />
                        <span className="text-lg">🪵 Battiscopa</span>
                      </Label>
                      {(accessoriesConfig as any).has_battiscopa && (
                        <div className="mt-3 space-y-3 pl-4 border-l-2 border-accent/30">
                          <div className="space-y-2">
                            <Label>Materiale battiscopa</Label>
                            <RadioGroup value={(accessoriesConfig as any).battiscopa_materiale || ''} onValueChange={v => setAccessoriesConfig(prev => ({ ...prev, battiscopa_materiale: v }))} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {[
                                { value: 'legno_laccato', label: '🪵 Legno laccato' },
                                { value: 'pvc', label: '🧱 PVC / Polimero' },
                                { value: 'mdf', label: '📐 MDF rivestito' },
                              ].map(opt => (
                                <Label key={opt.value} htmlFor={`batt-mat-${opt.value}`} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 text-sm transition-all ${(accessoriesConfig as any).battiscopa_materiale === opt.value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                                  <RadioGroupItem value={opt.value} id={`batt-mat-${opt.value}`} />
                                  {opt.label}
                                </Label>
                              ))}
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label>Altezza battiscopa</Label>
                            <RadioGroup value={(accessoriesConfig as any).battiscopa_altezza || ''} onValueChange={v => setAccessoriesConfig(prev => ({ ...prev, battiscopa_altezza: v }))} className="flex gap-3">
                              {['6', '8', '10'].map(h => (
                                <Label key={h} htmlFor={`batt-h-${h}`} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-4 py-3 text-sm transition-all ${(accessoriesConfig as any).battiscopa_altezza === h ? 'border-accent bg-accent/10' : 'border-border'}`}>
                                  <RadioGroupItem value={h} id={`batt-h-${h}`} />
                                  {h} cm
                                </Label>
                              ))}
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label>Colore/Finitura battiscopa</Label>
                            <Input placeholder="Es: Bianco optical, Tortora..." value={(accessoriesConfig as any).battiscopa_colore || ''} onChange={e => setAccessoriesConfig(prev => ({ ...prev, battiscopa_colore: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label>Quantità (metri lineari)</Label>
                            <Input type="number" placeholder="Es: 12" value={(accessoriesConfig as any).battiscopa_quantita || ''} onChange={e => setAccessoriesConfig(prev => ({ ...prev, battiscopa_quantita: e.target.value }))} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
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
                )}
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
                  <RadioGroup value={form.delivery_time} onValueChange={v => { update('delivery_time', v); update('delivery_date', ''); }} className="space-y-3">
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
                              opt.value === 'economy' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
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

                  {form.delivery_time && (
                    <div className="space-y-2 mt-3 p-3 rounded-lg border border-border bg-muted/30">
                      <Label className="text-sm font-medium">
                        📅 Seleziona data di consegna desiderata
                      </Label>
                      <Input
                        type="date"
                        value={form.delivery_date || ''}
                        onChange={e => update('delivery_date', e.target.value)}
                        min={(() => {
                          const d = new Date();
                          if (form.delivery_time === 'express') d.setDate(d.getDate() + 14);
                          else if (form.delivery_time === 'standard') d.setDate(d.getDate() + 28);
                          else d.setDate(d.getDate() + 56);
                          return d.toISOString().split('T')[0];
                        })()}
                        max={(() => {
                          const d = new Date();
                          if (form.delivery_time === 'express') d.setDate(d.getDate() + 21);
                          else if (form.delivery_time === 'standard') d.setDate(d.getDate() + 42);
                          return form.delivery_time === 'economy' ? '' : d.toISOString().split('T')[0];
                        })()}
                      />
                      <p className="text-xs text-muted-foreground">
                        {form.delivery_time === 'express' && 'Seleziona una data entro 2-3 settimane da oggi'}
                        {form.delivery_time === 'standard' && 'Seleziona una data tra 4-6 settimane da oggi'}
                        {form.delivery_time === 'economy' && 'Seleziona una data a partire da 8 settimane da oggi'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 9: Notes & Photos */}
            {step === 9 && (
              <div className="space-y-4">
                <CardTitle className="font-heading">Note e Foto</CardTitle>
                <CardDescription>Aggiungi note tecniche e foto del rilievo</CardDescription>

                {isMultiProduct && (
                  <div className="rounded-lg bg-accent/5 border border-accent/20 p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">📦 Riepilogo ordine multi-prodotto ({multiItems.length} pezzi)</p>
                    <div className="space-y-1">
                      {multiItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">#{i + 1}</span>
                          <span>{item.width_mm}×{item.height_mm} mm</span>
                          {item.notes && <span className="truncate max-w-[200px]">— {item.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Note tecniche generali</Label>
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

        {/* Navigation */}
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <Button variant="outline" onClick={goPrevStep} disabled={isFirstStep}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
          </Button>
          <div className="flex gap-3">
            {isLastStep && (
              <Button variant="outline" onClick={handleSaveDraft} disabled={savingDraft || submitting} className="gap-2">
                <Save className="h-4 w-4" />
                {savingDraft ? 'Salvataggio...' : 'Salva Bozza'}
              </Button>
            )}
            {!isLastStep ? (
              <Button onClick={goNextStep} disabled={!canGoNext()}>
                Avanti <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting || savingDraft} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Check className="h-4 w-4" />
                {submitting ? 'Invio in corso...' : `Invia ${isMultiProduct ? `${multiItems.length} Preventivi` : 'Preventivo'}`}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
