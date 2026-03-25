import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard } from 'lucide-react';
import PaymentSummary from '@/components/PaymentSummary';

export default function PaymentSummaryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Caricamento...</div></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CreditCard className="h-5 w-5 text-green-600" />
          <h1 className="text-lg font-bold font-heading text-foreground">Riepilogo Pagamenti</h1>
        </div>
      </header>
      <main className="container py-8">
        <PaymentSummary userId={user.id} />
      </main>
    </div>
  );
}
