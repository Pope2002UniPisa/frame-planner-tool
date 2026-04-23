import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Printer, Edit3, ThumbsUp, MessageSquare } from 'lucide-react';
import ProductDiagram, { COLOR_OPTIONS } from '@/components/ProductDiagram';
import { getColorLabel, ALL_HANDLE_FINISHES, ALL_HANDLE_MODELS, ALL_FRAMES, getDoorModel } from '@/data/doorCatalog';
import { toast } from 'sonner';
import { productLabels, statusLabels } from '@/lib/constants';

const isQuoteStatus = (status: string) => ['ricevuto', 'submitted', 'quoted', 'quote_accepted', 'quote_modifications'].includes(status);

export default function MeasurementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [m, setM] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modDialog, setModDialog] = useState(false);
  const [modNotes, setModNotes] = useState('');

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from('measurements')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
    setM(data);
    setLoading(false);
    });
  }, [user, id]);

  const handleAcceptQuote = async () => {
    const { error } = await supabase.from('measurements').update({ status: 'ordered' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setM((prev: any) => ({ ...prev, status: 'ordered' }));
    toast.success('Ordine confermato! Ti contatteremo per procedere.');
  };

  const handleRequestModifications = async () => {
    const { error } = await supabase.from('measurements').update({ 
      status: 'quote_modifications', 
      modification_notes: modNotes, 
      has_modification: true 
    }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setM((prev: any) => ({ ...prev, status: 'quote_modifications', modification_notes: modNotes }));
    setModDialog(false);
    setModNotes('');
    toast.success('Richiesta di modifiche inviata.');
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!m) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Misurazione non trovata</div>;

  const isQuote = isQuoteStatus(m.status);
  const isOrder = ['ordered', 'in_production', 'delivering', 'completed'].includes(m.status);
  const pageTitle = isOrder ? 'Dettaglio Ordine' : isQuote ? 'Dettaglio Preventivo' : 'Dettaglio Misurazione';

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

  const price = Number(m.estimated_price) || 0;
  const iva = Math.round(price * 0.22 * 100) / 100;
  const totalWithIva = Math.round((price + iva) * 100) / 100;

  // Resolve color to full label: try door catalog first, then window COLOR_OPTIONS
  const resolveColor = (colorId: string): { name: string; hex: string } | null => {
    const doorColor = getColorLabel(colorId);
    if (doorColor) return doorColor;
    const windowColor = COLOR_OPTIONS.find(c => c.value === colorId);
    if (windowColor) return { name: windowColor.label, hex: windowColor.hex };
    return null;
  };

  const resolveHandleType = (id: string): string => {
    const finish = ALL_HANDLE_FINISHES.find(f => f.id === id);
    if (finish) return finish.name;
    return id;
  };

  const resolveFrame = (id: string): string => {
    const frame = ALL_FRAMES.find(f => f.id === id);
    return frame ? frame.name : id;
  };

  const resolveHandleModel = (id: string): string => {
    const model = ALL_HANDLE_MODELS.find(m => m.id === id);
    return model ? model.name : id;
  };

  const resolveHandleFinish = (id: string): string => {
    const finish = ALL_HANDLE_FINISHES.find(f => f.id === id);
    return finish ? finish.name : id;
  };

  const doorModelId = acc?.door_model || '';
  const doorModelName = acc?.door_model_name || (doorModelId ? getDoorModel(doorModelId)?.name : null);
  const isDoor = ['porta', 'porta_finestrata', 'porta_filomuro'].includes(m.product_type);
  const fields: [string, any, any?][] = [
    ['Prodotto', doorModelName || (productLabels[m.product_type] || m.product_type)],
    ['Tipo rilievo', { foro_muro: 'Foro muro', luce_netta: 'Luce netta', grezzo: 'Grezzo', finito: 'Finito' }[m.survey_type] || m.survey_type],
    ['Larghezza (mm)', m.width_mm],
    ['Altezza (mm)', m.height_mm],
    m.depth_mm && ['Profondità (mm)', m.depth_mm],
    !isDoor && m.num_panels && ['Numero ante', m.num_panels],
    m.panel_type && ['Tipologia apertura', m.panel_type],
    m.opening_direction && ['Direzione apertura', m.opening_direction],
    m.frame_type && ['Tipo telaio', resolveFrame(m.frame_type)],
    m.material && ['Materiale', m.material],
    m.color_internal && ['Colore interno', m.color_internal, resolveColor(m.color_internal)],
    m.color_external && ['Colore esterno', m.color_external, resolveColor(m.color_external)],
    doorColorName && ['Colore porta', doorColorName],
    m.handle_type && ['Tipo maniglia', resolveHandleType(m.handle_type)],
    doorHandleModel && ['Modello maniglia', resolveHandleModel(doorHandleModel)],
    doorHandleFinish && ['Finitura maniglia', resolveHandleFinish(doorHandleFinish)],
    m.glass_type && ['Tipo vetro', { doppio_vetro: 'Doppio vetro', triplo_vetro: 'Triplo vetro', sicurezza: 'Vetro sicurezza', cieca: 'Cieca' }[m.glass_type] || m.glass_type],
    m.installation_type && ['Tipo fornitura', { solo_fornitura: 'Solo fornitura', con_installazione: 'Con installazione' }[m.installation_type] || m.installation_type],
    m.laying_type && ['Tipo posa', { standard: 'Standard', certificata: 'Certificata' }[m.laying_type] || m.laying_type],
    m.remove_old && ['Rimozione vecchio', 'Sì'],
    m.notes && ['Note', m.notes],
  ].filter(Boolean) as [string, any, any?][];

  const renderColorValue = (value: any, colorInfo: any) => {
    if (!colorInfo) return <span className="text-sm font-medium text-foreground">{value}</span>;
    return (
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md border border-border shadow-sm shrink-0" style={{ backgroundColor: colorInfo.hex }} />
        <span className="text-sm font-medium text-foreground">{colorInfo.name}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-lg font-bold font-heading text-foreground">{pageTitle}</h1>
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
          <Badge>{statusLabels[m.status]?.label || m.status}</Badge>
          <span className="text-sm text-muted-foreground">
            {new Date(m.created_at).toLocaleDateString('it-IT')} alle {new Date(m.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Accept/Reject quote buttons */}
        {['ricevuto', 'submitted', 'quoted'].includes(m.status) && (
          <Card className="border-2 border-accent/30 bg-accent/5">
            <CardContent className="py-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Vuoi accettare questo preventivo?</p>
              <p className="text-xs text-muted-foreground">Accettando il preventivo, verrà generato un ordine che dovrà essere confermato con firma.</p>
              <div className="flex gap-3">
                <Button className="gap-1.5" onClick={handleAcceptQuote}>
                  <ThumbsUp className="h-4 w-4" /> Accetta preventivo
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => setModDialog(true)}>
                  <MessageSquare className="h-4 w-4" /> Richiedi modifiche
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {m.status === 'quote_accepted' && (
          <Card className="border-2 border-green-500/30 bg-green-500/5">
            <CardContent className="py-4">
              <p className="text-sm font-semibold text-foreground">✅ Preventivo accettato</p>
              <p className="text-xs text-muted-foreground mt-1">L'ordine verrà confermato a breve dall'amministratore.</p>
            </CardContent>
          </Card>
        )}

        {m.status === 'quote_modifications' && (
          <Card className="border-2 border-destructive/30 bg-destructive/5">
            <CardContent className="py-4">
              <p className="text-sm font-semibold text-foreground">📝 Modifiche richieste</p>
              {m.modification_notes && <p className="text-xs text-muted-foreground mt-1">{m.modification_notes}</p>}
              <p className="text-xs text-muted-foreground mt-1">Il team sta valutando le modifiche richieste.</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-4">
            <ProductDiagram productType={m.product_type} widthMm={String(m.width_mm)} heightMm={String(m.height_mm)} depthMm={String(m.depth_mm || 70)} numPanels={String(m.num_panels || 1)} panelType={m.panel_type || ''} openingDirection={m.opening_direction || ''} handleType={m.handle_type || ''} glassType={m.glass_type || ''} frameType={m.frame_type || 'standard'} colorInternal={m.color_internal || ''} colorExternal={m.color_external || ''} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="font-heading">Dati {isQuote ? 'preventivo' : isOrder ? 'ordine' : 'misurazione'}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {fields.map(([label, value, colorInfo]) => (
                <div key={label} className="flex justify-between items-center border-b border-border/50 py-2">
                   <span className="text-sm text-muted-foreground">{label}</span>
                   {(label === 'Colore interno' || label === 'Colore esterno' || label === 'Colore porta') 
                     ? renderColorValue(value, colorInfo)
                     : <span className="text-sm font-medium text-foreground">{value}</span>
                   }
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>

        {/* Price with IVA */}
        {price > 0 && (isQuote || isOrder) && (
          <Card>
            <CardHeader><CardTitle className="font-heading">Riepilogo</CardTitle></CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}

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

      {/* Modification request dialog */}
      <Dialog open={modDialog} onOpenChange={setModDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Richiedi modifiche al preventivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Descrivi le modifiche che desideri. Il team le valuterà e invierà un nuovo preventivo aggiornato.</p>
            <Textarea value={modNotes} onChange={e => setModNotes(e.target.value)} placeholder="Descrivi le modifiche richieste..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModDialog(false); setModNotes(''); }}>Annulla</Button>
            <Button onClick={handleRequestModifications} disabled={!modNotes.trim()}>Invia richiesta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
