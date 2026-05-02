import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Trash2, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications, type AppNotification } from '@/hooks/useNotifications';

const typeIcon: Record<string, string> = {
  appointment: '📅',
  measurement: '📐',
  payment: '💶',
  status: '🔄',
  info: 'ℹ️',
};

function getNavigationPath(n: AppNotification): string | null {
  if (n.metadata?.measurementId) return `/misurazione/${n.metadata.measurementId}`;
  return null;
}

export function NotificationBell() {
  const { notifications, unreadCount, pushPermission, markAsRead, markAllAsRead, deleteNotification, deleteAllRead, requestPushPermission } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClickNotification = async (n: AppNotification) => {
    if (!n.read) await markAsRead(n.id);
    const path = getNavigationPath(n);
    if (path) {
      setOpen(false);
      navigate(path);
    }
  };

  const hasRead = notifications.some(n => n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifiche</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Segna tutte lette
              </button>
            )}
            {hasRead && (
              <button onClick={deleteAllRead} className="text-xs text-destructive/70 hover:text-destructive transition-colors">
                Cancella lette
              </button>
            )}
          </div>
        </div>

        {/* Lista notifiche */}
        <div className="max-h-80 overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nessuna notifica</p>
          ) : (
            notifications.map(n => {
              const navigable = !!getNavigationPath(n);
              return (
                <div key={n.id} className={`flex items-start gap-1 pr-2 ${!n.read ? 'bg-muted/30' : ''}`}>
                  <button
                    onClick={() => handleClickNotification(n)}
                    className={`flex-1 text-left px-4 py-3 hover:bg-muted/50 transition-colors ${navigable ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-base mt-0.5">{typeIcon[n.type] ?? typeIcon.info}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                          {n.title}
                          {navigable && <span className="ml-1 text-[10px] text-accent">→</span>}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.body}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(n.created_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteNotification(n.id)}
                    className="mt-3 p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Elimina notifica"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Push notifications banner */}
        {pushPermission === 'default' && (
          <div className="border-t px-4 py-3 flex items-center justify-between gap-2 bg-muted/20">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing className="h-4 w-4 text-accent shrink-0" />
              <p className="text-xs text-muted-foreground leading-tight">Attiva le notifiche anche quando non sei sulla piattaforma</p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 text-xs h-7 px-2" onClick={requestPushPermission}>
              Attiva
            </Button>
          </div>
        )}
        {pushPermission === 'denied' && (
          <div className="border-t px-4 py-2">
            <p className="text-[10px] text-muted-foreground text-center">Notifiche browser bloccate. Sblocca dal browser per attivarle.</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
