import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import ProductDiagram, { COLOR_OPTIONS } from '@/components/ProductDiagram';
import { getColorLabel, ALL_HANDLE_FINISHES, ALL_HANDLE_MODELS, ALL_FRAMES } from '@/data/doorCatalog';
import pratelliLogo from '@/assets/pratelli-logo.png';

const productLabels: Record<string, string> = {
  finestra: 'Finestra', porta_finestra: 'Porta Finestra', basculante: 'Basculante',
  zanzariera: 'Zanzariera', persiana: 'Persiana', porta: 'Porta',
  porta_finestrata: 'Porta Finestrata', porta_filomuro: 'Porta Filomuro',
};
const surveyLabels: Record<string, string> = {
  foro_muro: 'Foro muro', luce_netta: 'Luce netta', controtelaio: 'Controtelaio', vecchio_infisso: 'Vecchio infisso',
};

const statusLabels: Record<string, string> = {
  bozza: 'Bozza', ricevuto: 'Preventivo', submitted: 'Preventivo', quoted: 'Preventivo',
  quote_accepted: 'Preventivo accettato', quote_modifications: 'Modifiche richieste',
  ordered: 'Ordine confermato', in_production: 'In produzione', delivering: 'In consegna', completed: 'Completata',
};

const isQuoteStatus = (status: string) => ['ricevuto', 'submitted', 'quoted', 'quote_accepted', 'quote_modifications'].includes(status);

export default function MeasurementPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    supabase.from('measurements').select('*').eq('id', id).single().then(({ data }) => {
      setM(data);
      setLoading(false);
    });
  }, [user, id]);

  const handlePrint = () => window.print();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!m) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Misurazione non trovata</div>;

  const isQuote = isQuoteStatus(m.status);
  const isOrder = ['ordered', 'in_production', 'delivering', 'completed'].includes(m.status);
  const docTitle = isOrder ? 'Conferma d\'Ordine' : isQuote ? 'Preventivo' : 'Scheda Misurazione';

  const price = Number(m.estimated_price) || 0;
  const iva = Math.round(price * 0.22 * 100) / 100;
  const totalWithIva = Math.round((price + iva) * 100) / 100;

  const resolveColor = (colorId: string): string => {
    const doorColor = getColorLabel(colorId);
    if (doorColor) return doorColor.name;
    const windowColor = COLOR_OPTIONS.find(c => c.value === colorId);
    if (windowColor) return windowColor.label;
    return colorId;
  };

  const resolveHandleType = (id: string): string => {
    const finish = ALL_HANDLE_FINISHES.find(f => f.id === id);
    return finish ? finish.name : id;
  };

  const resolveFrame = (id: string): string => {
    const frame = ALL_FRAMES.find(f => f.id === id);
    return frame ? frame.name : id;
  };

  const acc = m.accessories_config as any;
  const doorHandleModel = acc?.door_handle_model_id || '';
  const doorHandleFinish = acc?.door_handle_finish_id || '';
  const doorColorName = acc?.door_color_name || '';

  const resolveHandleModel = (id: string): string => {
    const model = ALL_HANDLE_MODELS.find(m => m.id === id);
    return model ? model.name : id;
  };

  const rows: [string, string][] = [
    ['Prodotto', productLabels[m.product_type] || m.product_type],
    ['Cliente', m.client_name || '-'],
    ['Indirizzo', m.client_address || '-'],
    ['Tipo rilievo', surveyLabels[m.survey_type] || m.survey_type],
    ['Larghezza', `${m.width_mm} mm`],
    ['Altezza', `${m.height_mm} mm`],
    ...(m.depth_mm ? [['Profondità muro', `${m.depth_mm} mm`] as [string, string]] : []),
    ...(m.num_panels ? [['Numero ante', `${m.num_panels}`] as [string, string]] : []),
    ...(m.panel_type ? [['Tipologia apertura', m.panel_type] as [string, string]] : []),
    ...(m.opening_direction ? [['Direzione apertura', m.opening_direction] as [string, string]] : []),
    ...(m.frame_type ? [['Tipo telaio', resolveFrame(m.frame_type)] as [string, string]] : []),
    ...(m.material ? [['Materiale', m.material] as [string, string]] : []),
    ...(m.color_internal ? [['Colore interno', resolveColor(m.color_internal)] as [string, string]] : []),
    ...(m.color_external ? [['Colore esterno', resolveColor(m.color_external)] as [string, string]] : []),
    ...(doorColorName ? [['Colore porta', doorColorName] as [string, string]] : []),
    ...(m.handle_type ? [['Tipo maniglia', resolveHandleType(m.handle_type)] as [string, string]] : []),
    ...(doorHandleModel ? [['Modello maniglia', resolveHandleModel(doorHandleModel)] as [string, string]] : []),
    ...(doorHandleFinish ? [['Finitura maniglia', resolveHandleType(doorHandleFinish)] as [string, string]] : []),
    ...(m.glass_type ? [['Tipo vetro', m.glass_type] as [string, string]] : []),
    ...(m.is_square === false ? [['Fuori squadro', `${m.out_of_square_mm || 0} mm`] as [string, string]] : []),
    ...(m.is_plumb === false ? [['A piombo', 'No'] as [string, string]] : []),
    ...(m.is_level === false ? [['Livellato', 'No'] as [string, string]] : []),
    ...(m.internal_space_mm ? [['Spazio interno', `${m.internal_space_mm} mm`] as [string, string]] : []),
    ...(m.external_space_mm ? [['Spazio esterno', `${m.external_space_mm} mm`] as [string, string]] : []),
    ...(m.installation_type ? [['Tipo fornitura', m.installation_type === 'con_installazione' ? 'Con installazione' : 'Solo fornitura'] as [string, string]] : []),
    ...(m.laying_type ? [['Tipo posa', m.laying_type] as [string, string]] : []),
    ...(m.remove_old ? [['Rimozione vecchio', 'Sì'] as [string, string]] : []),
    ...(m.has_mosquito_net ? [['Accessorio', 'Zanzariera'] as [string, string]] : []),
    ...(m.has_shutter ? [['Accessorio', 'Tapparella'] as [string, string]] : []),
    ...(m.has_box ? [['Accessorio', 'Cassonetto'] as [string, string]] : []),
    ...(m.has_motorization ? [['Accessorio', 'Motorizzazione'] as [string, string]] : []),
    ...(m.notes ? [['Note', m.notes] as [string, string]] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-bold font-heading text-foreground">Anteprima di stampa</h1>
          <div className="ml-auto">
            <Button onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Stampa / PDF</Button>
          </div>
        </div>
      </div>

      <div ref={printRef} className="container max-w-3xl py-8 print:py-4 print:max-w-full">
        <div className="border border-border rounded-lg p-6 print:border-0 print:p-0 bg-card">
          <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-bold font-heading text-foreground">{docTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">{m.client_name} — {m.client_address}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Data: {new Date(m.created_at).toLocaleDateString('it-IT')}</p>
              <p>Stato: {statusLabels[m.status] || m.status}</p>
            </div>
          </div>

          <div className="mb-6">
            <ProductDiagram
              productType={m.product_type}
              widthMm={String(m.width_mm)}
              heightMm={String(m.height_mm)}
              depthMm={String(m.depth_mm || 70)}
              numPanels={String(m.num_panels || 1)}
              panelType={m.panel_type || ''}
              openingDirection={m.opening_direction || ''}
              handleType={m.handle_type || ''}
              glassType={m.glass_type || ''}
              frameType={m.frame_type || 'standard'}
              colorInternal={m.color_internal || ''}
              colorExternal={m.color_external || ''}
              internalSpaceMm={String(m.internal_space_mm || '')}
              externalSpaceMm={String(m.external_space_mm || '')}
            />
          </div>

          <table className="w-full text-sm">
            <tbody>
              {rows.map(([label, value], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="py-2 px-3 font-medium text-muted-foreground w-1/3">{label}</td>
                  <td className="py-2 px-3 text-foreground">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Price section with IVA */}
          {price > 0 && (isQuote || isOrder) && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="font-heading font-bold text-foreground mb-3">Riepilogo</h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="bg-muted/30">
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">Imponibile</td>
                      <td className="py-2.5 px-4 text-right font-medium text-foreground">€ {price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 font-medium text-muted-foreground">IVA (22%)</td>
                      <td className="py-2.5 px-4 text-right font-medium text-foreground">€ {iva.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-primary/5 border-t-2 border-primary/20">
                      <td className="py-3 px-4 font-bold text-foreground text-base">Totale IVA inclusa</td>
                      <td className="py-3 px-4 text-right font-bold text-foreground text-base">€ {totalWithIva.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {m.photo_urls && m.photo_urls.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="font-heading font-bold text-foreground mb-3">Foto rilievo</h3>
              <div className="grid grid-cols-2 gap-3">
                {m.photo_urls.map((url: string, i: number) => (
                  <img key={i} src={url} alt={`Foto ${i + 1}`} className="rounded-lg w-full h-32 object-cover print:h-24" />
                ))}
              </div>
            </div>
          )}

          {/* Footer with Pratelli logo */}
          <div className="mt-8 pt-4 border-t border-border flex items-center justify-center gap-3">
            <img src={pratelliLogo} alt="Pratelli Rappresentanze" className="h-12 object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
}
