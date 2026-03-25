import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Printer, Edit3 } from 'lucide-react';
import ProductDiagram from '@/components/ProductDiagram';
import { getColorLabel } from '@/data/doorCatalog';

const statusLabels: Record<string, string> = {
  bozza: 'Bozza', ricevuto: 'Inviata', submitted: 'Inviata', in_review: 'In revisione',
  quoted: 'Preventivata', ordered: 'Ordinata', completed: 'Completata',
};
const productLabels: Record<string, string> = {
  finestra: 'Finestra', porta_finestra: 'Porta Finestra', basculante: 'Basculante',
  zanzariera: 'Zanzariera', persiana: 'Persiana',
};

export default function MeasurementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from('measurements').select('*').eq('id', id).single().then(({ data }) => {
      setM(data);
      setLoading(false);
    });
  }, [user, id]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!m) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Misurazione non trovata</div>;

  // Extract door-specific data from accessories_config if stored there
  const acc = m.accessories_config as any;
  const doorHandleModel = acc?.door_handle_model_id || '';
  const doorHandleFinish = acc?.door_handle_finish_id || '';
  const doorColorName = acc?.door_color_name || '';

  const handleModelLabels: Record<string, string> = {
    minimal_design: 'Minimal Design', pure: 'Pure', baar: 'Baar',
  };
  const handleFinishLabels: Record<string, string> = {
    cromo_satinato: 'Cromo Satinato', cromo_lucido: 'Cromo Lucido',
    bianco_optical: 'Bianco Optical', nero: 'Nero', grigio_alluminio: 'Grigio Alluminio',
  };

  const fields: [string, any][] = [
    ['Prodotto', productLabels[m.product_type] || m.product_type],
    ['Cliente', m.client_name],
    ['Indirizzo', m.client_address],
    ['Tipo rilievo', m.survey_type],
    ['Larghezza (mm)', m.width_mm],
    ['Altezza (mm)', m.height_mm],
    m.depth_mm && ['Profondità (mm)', m.depth_mm],
    m.num_panels && ['Numero ante', m.num_panels],
    m.panel_type && ['Tipologia apertura', m.panel_type],
    m.opening_direction && ['Direzione apertura', m.opening_direction],
    m.frame_type && ['Tipo telaio', m.frame_type],
    m.material && ['Materiale', m.material],
    m.color_internal && ['Colore interno', m.color_internal, getColorLabel(m.color_internal)],
    m.color_external && ['Colore esterno', m.color_external, getColorLabel(m.color_external)],
    doorColorName && ['Colore porta', doorColorName],
    m.handle_type && ['Tipo maniglia', m.handle_type],
    doorHandleModel && ['Modello maniglia', handleModelLabels[doorHandleModel] || doorHandleModel],
    doorHandleFinish && ['Finitura maniglia', handleFinishLabels[doorHandleFinish] || doorHandleFinish],
    m.glass_type && ['Tipo vetro', m.glass_type],
    m.installation_type && ['Tipo fornitura', m.installation_type],
    m.laying_type && ['Tipo posa', m.laying_type],
    m.remove_old && ['Rimozione vecchio', 'Sì'],
    m.notes && ['Note', m.notes],
  ].filter(Boolean) as [string, any][];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-bold font-heading text-foreground">Dettaglio Misurazione</h1>
          <div className="ml-auto flex gap-2">
            {m.status === 'bozza' && (
              <Button variant="outline" size="sm" onClick={() => navigate(`/misurazione/${id}/modifica`)} className="gap-1">
                <Edit3 className="h-4 w-4" /> Modifica
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`/misurazione/${id}/stampa`)} className="gap-1">
              <Printer className="h-4 w-4" /> Stampa
            </Button>
          </div>
        </div>
      </header>
      <main className="container max-w-3xl py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Badge>{statusLabels[m.status] || m.status}</Badge>
          <span className="text-sm text-muted-foreground">{new Date(m.created_at).toLocaleDateString('it-IT')}</span>
        </div>
        <Card>
          <CardContent className="py-4">
            <ProductDiagram productType={m.product_type} widthMm={String(m.width_mm)} heightMm={String(m.height_mm)} depthMm={String(m.depth_mm || 70)} numPanels={String(m.num_panels || 1)} panelType={m.panel_type || ''} openingDirection={m.opening_direction || ''} handleType={m.handle_type || ''} glassType={m.glass_type || ''} frameType={m.frame_type || 'standard'} colorInternal={m.color_internal || ''} colorExternal={m.color_external || ''} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-heading">Dati misurazione</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {fields.map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-border/50 py-2">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {m.photo_urls && m.photo_urls.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="font-heading">Foto</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {m.photo_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Foto ${i + 1}`} className="rounded-lg w-full h-40 object-cover" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
