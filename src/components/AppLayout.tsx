import { useEffect, useState, ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { supabase } from '@/integrations/supabase/client';
import { AppSidebar } from '@/components/AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, signOut } = useAuth();
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isDark, setIsDark] = useState(false);

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
      <AppSidebar
        profile={profile}
        userEmail={user.email || ''}
        isAdmin={isAdmin}
        darkMode={isDark}
        onToggleDarkMode={handleToggleDarkMode}
        onSignOut={handleSignOut}
        onNavigate={navigate}
      />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
