import { useAuth } from '@/lib/auth';
import { useProfile } from '@/hooks/useDashboardQueries';
import { useAdminCheck } from '@/hooks/useAdminCheck';

// La contabilità è una sezione del back-office del singolo rivenditore, abilitata
// dal suo abbonamento (profiles.accounting_enabled) — oppure visibile all'admin.
export function useAccountingAccess() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const enabled = !!(profile as { accounting_enabled?: boolean } | undefined)?.accounting_enabled || isAdmin;
  // Aspetta ENTRAMBe le verifiche (profilo + ruolo admin): l'accesso dipende da
  // isAdmin, che è una query separata. Senza questo, con il profilo già in cache
  // ma l'admin-check ancora in corso, enabled risultava false e loading false →
  // redirect indebito alla dashboard passando tra le pagine di contabilità.
  return { enabled, loading: isLoading || adminLoading };
}
