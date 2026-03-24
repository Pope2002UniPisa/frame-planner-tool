import { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send, Upload } from 'lucide-react';
import ProductDiagram, { COLOR_OPTIONS } from '@/components/ProductDiagram';
import AccessoryConfig, { type AccessoriesConfig } from '@/components/AccessoryConfig';

export default function EditMeasurement() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [accessoriesConfig, setAccessoriesConfig] = useState<AccessoriesConfig>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from('measurements').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setForm({
          ...data,
          width_mm: String(data.width_mm),
          height_mm: String(data.height_mm),
          depth_mm: data.depth_mm ? String(data.depth_mm) : '',
          num_panels: String(data.num_panels || 1),
          internal_space_mm: data.internal_space_mm ? String(data.internal_space_mm) : '',
          external_space_mm: data.external_space_mm ? String(data.external_space_mm) : '',
          out_of_square_mm: data.out_of_square_mm ? String(data.out_of_square_mm) : '',
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

  const handleSave = async (newStatus?: string) => {
    setSaving(true);
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
        client_name: form.client_name,
        client_address: form.client_address,
        survey_type: form.survey_type,
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
        accessories_config: accessoriesConfig as any,
        ...(newStatus ? { status: newStatus } : {}),
      }).eq('id', id);

      if (error) throw error;
      toast.success(newStatus === 'ricevuto' ? 'Misurazione inviata!' : 'Bozza aggiornata!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Errore');
    } finally {
      setSaving(false);
    }
  };

  const ColorSelectField = ({ label, value, field }: { label: string; value: string; field: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || ''} onValueChange={v => update(field, v)}>
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-bold font-heading text-foreground">Modifica Bozza</h1>
        </div>
      </header>

      <main className="container max-w-4xl py-8 space-y-6">
        {/* Diagram preview */}
        <Card>
          <CardContent className="py-4">
            <ProductDiagram productType={form.product_type} widthMm={form.width_mm} heightMm={form.height_mm} depthMm={form.depth_mm} numPanels={form.num_panels} panelType={form.panel_type || ''} openingDirection={form.opening_direction || ''} handleType={form.handle_type || ''} glassType={form.glass_type || ''} frameType={form.frame_type || 'standard'} colorInternal={form.color_internal || ''} colorExternal={form.color_external || ''} internalSpaceMm={form.internal_space_mm} externalSpaceMm={form.external_space_mm} />
          </CardContent>
        </Card>

        {/* Client info */}
        <Card>
          <CardContent className="py-4 space-y-4">
            <CardTitle className="font-heading">Dati cliente</CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={form.client_name || ''} onChange={e => update('client_name', e.target.value)} /></div>
              <div className="space-y-2"><Label>Indirizzo</Label><Input value={form.client_address || ''} onChange={e => update('client_address', e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Dimensions */}
        <Card>
          <CardContent className="py-4 space-y-4">
            <CardTitle className="font-heading">Misure</CardTitle>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Larghezza (mm)</Label><Input type="number" value={form.width_mm} onChange={e => update('width_mm', e.target.value)} /></div>
              <div className="space-y-2"><Label>Altezza (mm)</Label><Input type="number" value={form.height_mm} onChange={e => update('height_mm', e.target.value)} /></div>
              <div className="space-y-2"><Label>Profondità (mm)</Label><Input type="number" value={form.depth_mm} onChange={e => update('depth_mm', e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardContent className="py-4 space-y-4">
            <CardTitle className="font-heading">Configurazione</CardTitle>
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Tipo apertura</Label>
                <Select value={form.panel_type || ''} onValueChange={v => update('panel_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="battente">Battente</SelectItem>
                    <SelectItem value="anta_ribalta">Anta-Ribalta</SelectItem>
                    <SelectItem value="vasistas">Vasistas</SelectItem>
                    <SelectItem value="scorrevole">Scorrevole</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finishes */}
        <Card>
          <CardContent className="py-4 space-y-4">
            <CardTitle className="font-heading">Finiture</CardTitle>
            <div className="grid grid-cols-2 gap-4">
              <ColorSelectField label="Colore interno" value={form.color_internal || ''} field="color_internal" />
              <ColorSelectField label="Colore esterno" value={form.color_external || ''} field="color_external" />
            </div>
            <div className="space-y-2">
              <Label>Tipo maniglia</Label>
              <Select value={form.handle_type || ''} onValueChange={v => update('handle_type', v)}>
                <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="con_chiave">Con chiave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardContent className="py-4 space-y-4">
            <CardTitle className="font-heading">Foto</CardTitle>
            {form.photo_urls && form.photo_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.photo_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Foto ${i + 1}`} className="rounded-lg w-full h-24 object-cover" />
                ))}
              </div>
            )}
            <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
              <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <input type="file" accept="image/*" multiple onChange={e => { if (e.target.files) setPhotoFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} className="hidden" id="photo-edit" />
              <Button variant="outline" size="sm" asChild><label htmlFor="photo-edit" className="cursor-pointer">Aggiungi foto</label></Button>
            </div>
            {photoFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs">
                    📷 {f.name}
                    <button onClick={() => setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-foreground">✕</button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent className="py-4 space-y-4">
            <CardTitle className="font-heading">Note</CardTitle>
            <Textarea value={form.notes || ''} onChange={e => update('notes', e.target.value)} rows={3} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => handleSave()} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Salvataggio...' : 'Salva bozza'}
          </Button>
          <Button onClick={() => handleSave('ricevuto')} disabled={saving} className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Send className="h-4 w-4" /> Invia misurazione
          </Button>
        </div>
      </main>
    </div>
  );
}
