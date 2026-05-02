import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Eye, Download, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { productLabels, statusLabels } from '@/lib/constants';
import AppLayout from '@/components/AppLayout';

interface EndClient {
  id: string;
  dealer_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
}

interface ClientDocument {
  id: string;
  client_id: string;
  dealer_id: string;
  name: string;
  type: string;
  file_url: string;
  file_size: number | null;
  created_at: string;
}

interface Measurement {
  id: string;
  product_type: string;
  status: string;
  width_mm: number;
  height_mm: number;
  estimated_price: number | null;
  created_at: string;
}

const DOC_TYPES = [
  { value: 'contratto', label: 'Contratto' },
  { value: 'foto_cantiere', label: 'Foto cantiere' },
  { value: 'preventivo', label: 'Preventivo' },
  { value: 'ordine', label: 'Ordine' },
  { value: 'documento', label: 'Documento' },
  { value: 'altro', label: 'Altro' },
];

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [client, setClient] = useState<EndClient | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState('documento');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const fetchAll = async () => {
      const { data: clientData } = await supabase
        .from('end_clients')
        .select('*')
        .eq('id', id)
        .eq('dealer_id', user.id)
        .single();

      if (!clientData) {
        setLoading(false);
        return;
      }

      setClient(clientData as EndClient);
      setFormName(clientData.name ?? '');
      setFormEmail(clientData.email ?? '');
      setFormPhone(clientData.phone ?? '');
      setFormAddress(clientData.address ?? '');
      setFormCity(clientData.city ?? '');
      setFormNotes(clientData.notes ?? '');

      const [{ data: mData }, { data: dData }] = await Promise.all([
        supabase
          .from('measurements')
          .select('id,product_type,status,width_mm,height_mm,estimated_price,created_at')
          .ilike('client_name', clientData.name)
          .order('created_at', { ascending: false }),
        supabase
          .from('client_documents')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
      ]);

      setMeasurements((mData as Measurement[]) || []);
      setDocuments((dData as ClientDocument[]) || []);
      setLoading(false);
    };
    fetchAll();
  }, [user, id]);

  const handleSave = async () => {
    if (!user || !id) return;
    setSaving(true);
    const { error } = await supabase
      .from('end_clients')
      .update({
        name: formName,
        email: formEmail || null,
        phone: formPhone || null,
        address: formAddress || null,
        city: formCity || null,
        notes: formNotes || null,
      })
      .eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setClient(prev => prev ? { ...prev, name: formName, email: formEmail || null, phone: formPhone || null, address: formAddress || null, city: formCity || null, notes: formNotes || null } : prev);
    toast.success('Dati salvati');
  };

  const handleDeleteDocument = async (doc: ClientDocument) => {
    if (!user) return;
    const { error } = await supabase.from('client_documents').delete().eq('id', doc.id);
    if (error) { toast.error(error.message); return; }
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
    toast.success('Documento eliminato');
  };

  const handleUpload = async () => {
    if (!user || !id || !uploadFile || !uploadName.trim()) {
      toast.error('Seleziona un file e inserisci un nome');
      return;
    }
    setUploading(true);
    const ext = uploadFile.name.split('.').pop() ?? 'bin';
    const path = `${user.id}/${id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(path, uploadFile, { upsert: true });

    if (uploadError) {
      setUploading(false);
      toast.error(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('client-documents').getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    const { data: docData, error: insertError } = await supabase
      .from('client_documents')
      .insert({
        client_id: id,
        dealer_id: user.id,
        name: uploadName.trim(),
        type: uploadType,
        file_url: fileUrl,
        file_size: uploadFile.size,
      })
      .select()
      .single();

    setUploading(false);
    if (insertError) { toast.error(insertError.message); return; }
    setDocuments(prev => [docData as ClientDocument, ...prev]);
    setUploadFile(null);
    setUploadName('');
    setUploadType('documento');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Documento caricato');
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />)}
        </div>
      </AppLayout>
    );
  }

  if (!client) {
    return (
      <AppLayout>
        <div className="p-6 text-center text-muted-foreground">Cliente non trovato.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard/clienti')}>
            <ArrowLeft className="h-4 w-4" /> Clienti
          </Button>
          <h1 className="text-xl font-bold font-heading text-foreground">{client.name}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Dati cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="client-name">Nome</Label>
                <Input id="client-name" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-email">Email</Label>
                <Input id="client-email" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-phone">Telefono</Label>
                <Input id="client-phone" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-city">Città</Label>
                <Input id="client-city" value={formCity} onChange={e => setFormCity(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="client-address">Indirizzo</Label>
                <Input id="client-address" value={formAddress} onChange={e => setFormAddress(e.target.value)} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="client-notes">Note</Label>
                <Textarea id="client-notes" rows={3} value={formNotes} onChange={e => setFormNotes(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvataggio...' : 'Salva modifiche'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Misurazioni collegate</CardTitle>
          </CardHeader>
          <CardContent>
            {measurements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna misurazione collegata.</p>
            ) : (
              <div className="space-y-2">
                {measurements.map(m => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-background">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground">{productLabels[m.product_type] || m.product_type}</span>
                      <Badge variant={statusLabels[m.status]?.variant ?? 'default'} className="text-[10px]">
                        {statusLabels[m.status]?.label ?? m.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{m.width_mm}×{m.height_mm}mm</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.estimated_price != null && m.estimated_price > 0 && (
                        <span className="text-xs font-medium text-accent">€{Number(m.estimated_price).toLocaleString('it-IT')}</span>
                      )}
                      <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString('it-IT')}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/misurazione/${m.id}`)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Documenti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun documento caricato.</p>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 bg-background">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-sm font-medium text-foreground truncate">{doc.name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">{doc.type}</Badge>
                      {doc.file_size != null && (
                        <span className="text-xs text-muted-foreground shrink-0">{(doc.file_size / 1024).toFixed(0)} KB</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteDocument(doc)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Carica documento</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="upload-file">File</Label>
                  <Input
                    id="upload-file"
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
                    onChange={e => {
                      const f = e.target.files?.[0] ?? null;
                      setUploadFile(f);
                      if (f && !uploadName) setUploadName(f.name.replace(/\.[^.]+$/, ''));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-name">Nome documento</Label>
                  <Input id="upload-name" placeholder="Es. Contratto 2026" value={uploadName} onChange={e => setUploadName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="upload-type">Tipo</Label>
                  <Select value={uploadType} onValueChange={setUploadType}>
                    <SelectTrigger id="upload-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleUpload} disabled={uploading || !uploadFile} className="gap-1.5">
                <Upload className="h-4 w-4" />
                {uploading ? 'Caricamento...' : 'Carica'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
