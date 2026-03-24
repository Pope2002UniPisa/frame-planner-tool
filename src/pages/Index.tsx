import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Caricamento...</div>
      </div>
    );
  }

  return <Navigate to={user ? '/dashboard' : '/auth'} replace />;
}
