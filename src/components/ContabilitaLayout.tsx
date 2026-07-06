import { ReactNode } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAccountingAccess } from '@/hooks/useAccountingAccess';
import { cn } from '@/lib/utils';

const TABS = [
  { label: 'Riepilogo', href: '/contabilita' },
  { label: 'Importa', href: '/contabilita/importa' },
  { label: 'Giornale', href: '/contabilita/giornale' },
  { label: 'IVA', href: '/contabilita/iva' },
  { label: 'Scadenzario', href: '/contabilita/scadenzario' },
  { label: 'Cespiti', href: '/contabilita/cespiti' },
  { label: 'Fatture attive', href: '/contabilita/fatture-attive' },
  { label: 'Bilancio', href: '/contabilita/bilancio' },
];

export default function ContabilitaLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { enabled, loading } = useAccountingAccess();

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>;
  if (!enabled) return <Navigate to="/dashboard" replace />;

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold font-heading text-foreground">Contabilità</h1>
          <p className="text-sm text-muted-foreground">Il tuo back-office contabile — fatture, partita doppia, IVA, bilancio.</p>
        </div>
        <div className="flex gap-1 flex-wrap border-b border-border">
          {TABS.map(t => {
            const active = location.pathname === t.href;
            return (
              <Link key={t.href} to={t.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-t-lg transition-colors',
                  active ? 'border-b-2 border-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}>
                {t.label}
              </Link>
            );
          })}
        </div>
        {children}
      </div>
    </AppLayout>
  );
}
