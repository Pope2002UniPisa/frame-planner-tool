import { useEffect, useState, ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';
import { Menu } from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('user_id', user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  useEffect(() => {
    if (profile !== null) {
      const dark = !!profile.dark_mode;
      setIsDark(dark);
      document.documentElement.classList.toggle('dark', dark);
    }
  }, [profile?.dark_mode]);

  const handleToggleDarkMode = async () => {
    const newDark = !isDark;
    setIsDark(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    if (user) await supabase.from('profiles').update({ dark_mode: newDark }).eq('user_id', user.id);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Caricamento...</div>
    </div>
  );
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

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Top bar solo su mobile */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center h-12 px-4 py-2 bg-background border-b border-border gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
            aria-label="Apri menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <span className="font-semibold text-sm text-foreground truncate">Pratelli Rappresentanze</span>
        </div>
        {children}
      </main>
    </div>
  );
}
