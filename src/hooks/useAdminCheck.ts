import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export function useAdminCheck() {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading: loading } = useQuery({
    queryKey: user ? ['adminRole', user.id] : ['adminRole', null],
    queryFn: async (): Promise<boolean> => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id)
        .eq('role', 'admin');
      return !!(data && data.length > 0);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // cache 10 minuti — il ruolo admin non cambia spesso
  });

  return { isAdmin, loading };
}
