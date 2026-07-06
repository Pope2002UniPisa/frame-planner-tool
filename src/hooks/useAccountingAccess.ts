import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useDashboardQueries';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// La contabilità è una sezione del back-office del singolo rivenditore, abilitata
// dal suo abbonamento (profiles.accounting_enabled) — oppure visibile all'admin.
export function useAccountingAccess() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const { isAdmin } = useAdminCheck();
  const enabled = !!(profile as { accounting_enabled?: boolean } | undefined)?.accounting_enabled || isAdmin;
  return { enabled, loading: isLoading };
}
