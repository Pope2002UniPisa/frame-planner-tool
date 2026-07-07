import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  CreditCard, Search, Filter, Eye, Euro, CheckCircle2,
  AlertCircle, Clock, Receipt, Download, Plus, Banknote
} from 'lucide-react';
import { productLabels } from '@/lib/constants';
import type { Database } from '@/integrations/supabase/types';
import { getErrorMessage } from '@/lib/errors';

type MeasurementRow = Database['public']['Tables']['measurements']['Row'] & { product_type: string };
type PaymentRow = Database['public']['Tables']['payments']['Row'];
type EnrichedMeasurement = MeasurementRow & {
  payments: PaymentRow[];
  totalPaid: number;
  remaining: number;
  isPaidInFull: boolean;
};

const PAYMENT_METHODS = [
  { value: 'bonifico', label: '🏦 Bonifico Bancario', icon: Banknote },
  { value: 'opyn', label: '💳 Opyn Pay Later', icon: CreditCard },
  { value: 'paypal', label: '🅿️ PayPal', icon: CreditCard },
  { value: 'klarna', label: '🟡 Klarna', icon: CreditCard },
  { value: 'satispay', label: '🔴 Satispay', icon: CreditCard },
  { value: 'carta', label: '💳 Carta di credito/debito', icon: CreditCard },
  { value: 'contanti', label: '💵 Contanti', icon: Banknote },
  { value: 'assegno', label: '📝 Assegno', icon: Receipt },
];

interface PaymentSummaryProps {
  userId: string;
}

export default function PaymentSummary({ userId }: PaymentSummaryProps) {
  const navigate = useNavigate();
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<EnrichedMeasurement | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'bonifico',
    reference_number: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: mData }, { data: pData }] = await Promise.all([
        supabase
          .from('measurements')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['quoted', 'ordered', 'completed'])
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('user_id', userId)
          .order('payment_date', { ascending: false }),
      ]);
      setMeasurements((mData || []) as MeasurementRow[]);
      setPayments(pData || []);
      setLoadingData(false);
    };
    fetchData();
  }, [userId]);

  const paymentsByMeasurement = useMemo(() => {
    const map: Record<string, PaymentRow[]> = {};
    payments.forEach(p => {
      if (!map[p.measurement_id]) map[p.measurement_id] = [];
      map[p.measurement_id].push(p);
    });
    return map;
  }, [payments]);

  const enrichedMeasurements = useMemo(() => {
    return measurements.map(m => {
      const mPayments = paymentsByMeasurement[m.id] || [];
      const totalPaid = mPayments.reduce((sum: number, p) => sum + Number(p.amount), 0);
      const estimatedPrice = Number(m.estimated_price) || 0;
      const remaining = Math.max(0, estimatedPrice - totalPaid);
      const isPaidInFull = remaining <= 0 && estimatedPrice > 0;
      return { ...m, payments: mPayments, totalPaid, remaining, isPaidInFull };
    });
  }, [measurements, paymentsByMeasurement]);

  const filtered = useMemo(() => {
    return enrichedMeasurements.filter(m => {
      if (searchText && !(m.client_name || '').toLowerCase().includes(searchText.toLowerCase())) return false;
      if (paymentStatusFilter === 'paid' && !m.isPaidInFull) return false;
      if (paymentStatusFilter === 'partial' && (m.totalPaid === 0 || m.isPaidInFull)) return false;
      if (paymentStatusFilter === 'unpaid' && m.totalPaid > 0) return false;
      if (methodFilter !== 'all') {
        const hasMethod = m.payments.some((p) => p.payment_method === methodFilter);
        if (!hasMethod) return false;
      }
      return true;
    });
  }, [enrichedMeasurements, searchText, paymentStatusFilter, methodFilter]);

  const stats = useMemo(() => {
    const totalDue = enrichedMeasurements.reduce((s, m) => s + (Number(m.estimated_price) || 0), 0);
    const totalPaid = enrichedMeasurements.reduce((s, m) => s + m.totalPaid, 0);
    const totalRemaining = totalDue - totalPaid;
    const paidCount = enrichedMeasurements.filter(m => m.isPaidInFull).length;
    const partialCount = enrichedMeasurements.filter(m => m.totalPaid > 0 && !m.isPaidInFull).length;
    const unpaidCount = enrichedMeasurements.filter(m => m.totalPaid === 0).length;
    return { totalDue, totalPaid, totalRemaining, paidCount, partialCount, unpaidCount };
  }, [enrichedMeasurements]);

  const handleRegisterPayment = async () => {
    if (!selectedMeasurement || !paymentForm.amount) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('payments').insert({
        measurement_id: selectedMeasurement.id,
        user_id: userId,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null,
        invoice_number: `FT-${Date.now().toString(36).toUpperCase()}`,
      });
      if (error) throw error;

      // Update measurement payment status
      const newTotalPaid = selectedMeasurement.totalPaid + parseFloat(paymentForm.amount);
      const estimated = Number(selectedMeasurement.estimated_price) || 0;
      const newStatus = newTotalPaid >= estimated ? 'pagato' : 'parziale';
      await supabase.from('measurements').update({
        payment_status: newStatus,
        amount_paid: newTotalPaid,
        payment_method: paymentForm.payment_method,
      }).eq('id', selectedMeasurement.id);

      toast.success('Pagamento registrato con successo');
      setShowPaymentDialog(false);
      setPaymentForm({ amount: '', payment_method: 'bonifico', reference_number: '', notes: '' });

      // Refresh data
      const [{ data: mData }, { data: pData }] = await Promise.all([
        supabase
          .from('measurements')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['quoted', 'ordered', 'completed'])
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('user_id', userId)
          .order('payment_date', { ascending: false }),
      ]);
      setMeasurements((mData || []) as MeasurementRow[]);
      setPayments(pData || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore durante la registrazione'));
    } finally {
      setSubmitting(false);
    }
  };

  const generateReceiptText = (m: MeasurementRow, payment: PaymentRow) => {
    const method = PAYMENT_METHODS.find(pm => pm.value === payment.payment_method);
    return `RICEVUTA DI PAGAMENTO\n\nCliente: ${m.client_name}\nProdotto: ${productLabels[m.product_type] || m.product_type}\nImporto: €${Number(payment.amount).toLocaleString('it-IT')}\nMetodo: ${method?.label || payment.payment_method}\nData: ${new Date(payment.payment_date).toLocaleDateString('it-IT')}\nRiferimento: ${payment.reference_number || '-'}\nN. Fattura: ${payment.invoice_number || '-'}\n\n---\nGenerato automaticamente dal Portale Misurazioni`;
  };

  const downloadReceipt = (m: MeasurementRow, payment: PaymentRow) => {
    const text = generateReceiptText(m, payment);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ricevuta_${payment.invoice_number || payment.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingData) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: 'Totale dovuto', value: `€${Math.round(stats.totalDue).toLocaleString('it-IT')}`, color: 'text-foreground', icon: Euro },
          { label: 'Incassato', value: `€${Math.round(stats.totalPaid).toLocaleString('it-IT')}`, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Residuo', value: `€${Math.round(stats.totalRemaining).toLocaleString('it-IT')}`, color: 'text-destructive', icon: AlertCircle },
          { label: 'Saldati', value: stats.paidCount, color: 'text-green-600', icon: CheckCircle2 },
          { label: 'Parziali', value: stats.partialCount, color: 'text-amber-500', icon: Clock },
          { label: 'Da pagare', value: stats.unpaidCount, color: 'text-destructive', icon: AlertCircle },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-3 px-4 text-center">
              <s.icon className={`h-4 w-4 mx-auto mb-1 ${s.color}`} />
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Filtri pagamenti</CardTitle>
          <CardDescription>Gestisci i pagamenti degli ordini e scarica le ricevute.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Cerca cliente..." className="pl-10" value={searchText} onChange={e => setSearchText(e.target.value)} />
              </div>
            </div>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="paid">Saldati</SelectItem>
                <SelectItem value="partial">Parziali</SelectItem>
                <SelectItem value="unpaid">Da pagare</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i metodi</SelectItem>
                {PAYMENT_METHODS.map(pm => (
                  <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(searchText || paymentStatusFilter !== 'all' || methodFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchText(''); setPaymentStatusFilter('all'); setMethodFilter('all'); }}>
              Cancella filtri
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Nessun pagamento corrisponde ai filtri selezionati.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const estimated = Number(m.estimated_price) || 0;
            const progress = estimated > 0 ? Math.min(100, (m.totalPaid / estimated) * 100) : 0;
            return (
              <Card key={m.id} className={m.isPaidInFull ? 'border-green-500/30' : m.totalPaid > 0 ? 'border-amber-400/30' : ''}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge variant={m.isPaidInFull ? 'secondary' : m.totalPaid > 0 ? 'outline' : 'destructive'} className="text-[10px] gap-1 shrink-0">
                        {m.isPaidInFull ? <CheckCircle2 className="h-3 w-3" /> : m.totalPaid > 0 ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {m.isPaidInFull ? 'Saldato' : m.totalPaid > 0 ? 'Parziale' : 'Da pagare'}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground truncate">{m.client_name || 'Senza nome'}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">{productLabels[m.product_type] || m.product_type}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-medium text-foreground">€{Math.round(m.totalPaid).toLocaleString('it-IT')}/{Math.round(estimated).toLocaleString('it-IT')}</span>
                      {!m.isPaidInFull && (
                        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => {
                          setSelectedMeasurement(m);
                          setPaymentForm({ amount: String(m.remaining), payment_method: 'bonifico', reference_number: '', notes: '' });
                          setShowPaymentDialog(true);
                        }}>
                          <Plus className="h-3 w-3" />
                          Paga
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/misurazione/${m.id}`)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${m.isPaidInFull ? 'bg-green-500' : m.totalPaid > 0 ? 'bg-amber-400' : 'bg-destructive'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* Payment history */}
                  {m.payments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {m.payments.map((p) => {
                        const method = PAYMENT_METHODS.find(pm => pm.value === p.payment_method);
                        return (
                          <div key={p.id} className="flex items-center justify-between text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1">
                            <div className="flex items-center gap-1.5">
                              <Receipt className="h-3 w-3" />
                              <span>{method?.label || p.payment_method}</span>
                              <span className="font-medium text-foreground">€{Number(p.amount).toLocaleString('it-IT')}</span>
                              <span>{new Date(p.payment_date).toLocaleDateString('it-IT')}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => downloadReceipt(m, p)} title="Scarica ricevuta">
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Totale: {filtered.length} ordini visualizzati su {enrichedMeasurements.length}
      </p>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Registra Pagamento</DialogTitle>
          </DialogHeader>
          {selectedMeasurement && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{selectedMeasurement.client_name}</p>
                <p className="text-muted-foreground">{productLabels[selectedMeasurement.product_type] || selectedMeasurement.product_type} — Residuo: €{Math.round(selectedMeasurement.remaining).toLocaleString('it-IT')}</p>
              </div>
              <div className="space-y-2">
                <Label>Importo (€) *</Label>
                <Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label>Metodo di pagamento *</Label>
                <RadioGroup value={paymentForm.payment_method} onValueChange={v => setPaymentForm(prev => ({ ...prev, payment_method: v }))} className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => (
                    <Label key={pm.value} htmlFor={`pm-${pm.value}`} className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 p-3 text-sm transition-all ${paymentForm.payment_method === pm.value ? 'border-accent bg-accent/10' : 'border-border'}`}>
                      <RadioGroupItem value={pm.value} id={`pm-${pm.value}`} />
                      {pm.label}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Riferimento / CRO</Label>
                <Input value={paymentForm.reference_number} onChange={e => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))} placeholder="Numero bonifico, ID transazione..." />
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea value={paymentForm.notes} onChange={e => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Note aggiuntive..." rows={2} />
              </div>
              <Button onClick={handleRegisterPayment} disabled={submitting || !paymentForm.amount} className="w-full gap-2">
                <CreditCard className="h-4 w-4" />
                {submitting ? 'Registrazione...' : 'Registra Pagamento'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
