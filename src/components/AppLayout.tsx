import { useEffect, useState, ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile, QUERY_KEYS, type Profile } from '@/hooks/useDashboardQueries';
import { AppSidebar } from '@/components/AppSidebar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Menu } from 'lucide-react';
import pratelliLogo from '@/assets/pratelli-logo.png';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Usa la stessa cache React Query del Dashboard → nessun fetch duplicato
  const { data: profile } = useProfile(user?.id);

  const [isDark, setIsDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      // Only override default when profile explicitly sets dark_mode
      const dark = profile.dark_mode !== false;
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    }
  }, [profile?.dark_mode]);

  const handleToggleDarkMode = async () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    if (user) {
      // Aggiorna la cache condivisa con Dashboard
      queryClient.setQueryData<Profile>(QUERY_KEYS.profile(user.id), (prev) =>
        prev ? { ...prev, dark_mode: newDark } : prev
      );
      await supabase.from('profiles').update({ dark_mode: newDark }).eq('user_id', user.id);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar: overlay su mobile, fisso su desktop */}
      <AppSidebar
        profile={profile}
        userEmail={user.email || ''}
        isAdmin={isAdmin}
        darkMode={isDark}
        onToggleDarkMode={handleToggleDarkMode}
        onSignOut={handleSignOut}
        onNavigate={navigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Backdrop mobile con animazione */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Top bar solo su mobile */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center h-12 px-4 py-2 bg-background border-b border-border gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-muted active:scale-95 transition-all shrink-0"
            aria-label="Apri menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <img src={pratelliLogo} alt="Pratelli Rappresentanze" className="h-7 object-contain" />
        </div>
        {children}
      </main>
    </div>
  );
}
