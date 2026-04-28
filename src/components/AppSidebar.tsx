import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plus, Users, Truck, CreditCard, LogOut, Shield, Settings, Moon, Sun } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import pratelliLogo from '@/assets/pratelli-logo.png';

interface Props {
  profile: any;
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

export function AppSidebar({ profile, userEmail, isAdmin, darkMode, onToggleDarkMode, onSignOut, onNavigate, isOpen = false, onClose = () => {} }: Props) {
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
      <div className="px-4 pt-4 pb-3.5 border-b border-white/10">
        <div className="bg-white/95 rounded-lg px-3 py-2 inline-flex items-center">
          <img src={pratelliLogo} alt="Pratelli Rappresentanze" className="h-8 object-contain" />
        </div>
      </div>

      {/* Operator info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-white font-bold text-sm">
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
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ icon: Icon, label, href }) => {
          const active = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs text-white/75">
            {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            <span>Tema scuro</span>
          </div>
          <Switch checked={darkMode} onCheckedChange={onToggleDarkMode} className="scale-[0.75] origin-right" />
        </div>

        <div className="flex gap-1">
          {isAdmin && (
            <button
              onClick={() => { onNavigate('/admin'); onClose(); }}
              title="Admin"
              className="flex-1 flex items-center justify-center rounded-lg py-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Shield className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => { onNavigate('/profilo'); onClose(); }}
            title="Profilo"
            className="flex-1 flex items-center justify-center rounded-lg py-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onSignOut}
            title="Esci"
            className="flex-1 flex items-center justify-center rounded-lg py-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
