import { useAuth } from '@/lib/auth';
import { CreditCard } from 'lucide-react';
import PaymentSummary from '@/components/PaymentSummary';
import AppLayout from '@/components/AppLayout';

export default function PaymentSummaryPage() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)', fontWeight: 400, letterSpacing: '-0.02em' }}>Pagamenti</h1>
            <p className="text-sm text-muted-foreground">Gestisci e traccia i pagamenti dei tuoi ordini</p>
          </div>
        </div>
        {user && <PaymentSummary userId={user.id} />}
      </div>
    </AppLayout>
  );
}
