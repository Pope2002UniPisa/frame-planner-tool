import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, Users, Truck, CreditCard, LogOut, Shield, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import pratelliLogo from '@/assets/pratelli-logo.png';
import type { Profile } from '@/hooks/useDashboardQueries';

interface Props {
  profile: Profile | null | undefined;
  userEmail: string;
  isAdmin: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Plus, label: 'Nuova misurazione', href: '/nuova-misurazione' },
  { icon: Users, label: 'Clienti', href: '/dashboard/clienti' },
  { icon: Truck, label: 'Consegne', href: '/dashboard/consegne' },
  { icon: CreditCard, label: 'Pagamenti', href: '/dashboard/pagamenti' },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AppSidebar({ profile, userEmail, isAdmin, darkMode: _darkMode, onToggleDarkMode: _onToggleDarkMode, onSignOut, onNavigate, isOpen = false, onClose = () => {} }: Props) {
  const location = useLocation();
  const initials = (profile?.full_name || userEmail || '?')[0].toUpperCase();

  return (
    <aside
      className={cn(
        // Layout base
        'w-60 shrink-0 flex flex-col overflow-hidden',
        // Mobile: overlay fisso, si sposta fuori dallo schermo quando chiuso
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop (lg+): sempre visibile, sticky nel flex layout
        'lg:relative lg:translate-x-0 lg:z-auto lg:sticky lg:top-0 lg:h-screen'
      )}
      style={{ background: 'hsl(var(--sidebar-background))' }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/5">
        <img src={pratelliLogo} alt="Pratelli Rappresentanze" className="h-8 object-contain opacity-90" style={{ filter: 'brightness(0) invert(1)' }} />
      </div>

      {/* Operator info */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {profile?.full_name || userEmail}
            </p>
            {profile?.company_name && (
              <p className="text-xs text-white/50 truncate mt-0.5">{profile.company_name}</p>
            )}
            {profile?.full_name && (
              <p className="text-[10px] text-white/35 truncate mt-0.5">{userEmail}</p>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ icon: Icon, label, href }) => {
          const active = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              onClick={onClose}
              className={cn(
                // Base: altezza minima 44px per touch target ottimale
                'flex items-center gap-3 py-3 rounded-lg text-sm font-medium',
                'transition-all duration-150 active:scale-95',
                active
                  ? 'border-l-2 border-accent bg-white/5 text-white pl-[calc(0.75rem-2px)] pr-3'
                  : 'text-white/70 hover:bg-white/5 hover:text-white active:bg-white/10 px-3'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t border-white/5">
        <div className="flex gap-1">
          {isAdmin && (
            <button
              onClick={() => { onNavigate('/admin'); onClose(); }}
              title="Admin"
              className="flex-1 flex items-center justify-center rounded-lg py-2.5 text-white/50 hover:bg-white/8 hover:text-white active:scale-95 active:bg-white/15 transition-all duration-150"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => { onNavigate('/profilo'); onClose(); }}
            title="Profilo"
            className="flex-1 flex items-center justify-center rounded-lg py-2.5 text-white/50 hover:bg-white/8 hover:text-white active:scale-95 active:bg-white/15 transition-all duration-150"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onSignOut}
            title="Esci"
            className="flex-1 flex items-center justify-center rounded-lg py-2.5 text-white/50 hover:bg-white/8 hover:text-white active:scale-95 active:bg-white/15 transition-all duration-150"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
