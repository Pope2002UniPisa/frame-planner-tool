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
  const {
    notifications, unreadCount, pushPermission,
    markAsRead, markAllAsRead, deleteNotification, deleteAllRead, requestPushPermission,
  } = useNotifications();
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

      <PopoverContent className="w-[400px] p-0" align="end">

        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifiche</span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Segna tutte lette
              </button>
            )}
            {hasRead && (
              <button
                onClick={deleteAllRead}
                className="text-xs text-destructive/60 hover:text-destructive transition-colors"
              >
                Cancella lette
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="max-h-[420px] overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nessuna notifica
            </p>
          ) : (
            notifications.map(n => {
              const navigable = !!getNavigationPath(n);
              return (
                <div
                  key={n.id}
                  className={`relative group ${!n.read ? 'bg-muted/30' : ''}`}
                >
                  {/* Area cliccabile principale */}
                  <button
                    onClick={() => handleClickNotification(n)}
                    className="w-full text-left px-4 py-3 pr-10 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-base mt-0.5 shrink-0">
                        {typeIcon[n.type] ?? typeIcon.info}
                      </span>
                      <div className="flex-1 min-w-0">
                        {/* Titolo + pallino non letta */}
                        <div className="flex items-start gap-2">
                          <p className={`text-sm leading-snug flex-1 ${!n.read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          )}
                        </div>
                        {/* Body */}
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        )}
                        {/* Data + link apri ordine */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString('it-IT', {
                              day: '2-digit', month: 'short',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                          {navigable && (
                            <span className="text-[11px] text-accent font-medium">
                              Apri ordine →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Pulsante elimina — visibile solo in hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    className="absolute top-2.5 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Elimina notifica"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Banner attiva push */}
        {pushPermission === 'default' && (
          <div className="border-t px-4 py-3 flex items-center justify-between gap-3 bg-muted/20">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing className="h-4 w-4 text-accent shrink-0" />
              <p className="text-xs text-muted-foreground leading-snug">
                Ricevi notifiche anche quando non sei sulla piattaforma
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-xs h-7 px-2.5"
              onClick={requestPushPermission}
            >
              Attiva
            </Button>
          </div>
        )}
        {pushPermission === 'denied' && (
          <div className="border-t px-4 py-2.5">
            <p className="text-[10px] text-muted-foreground text-center">
              Notifiche browser bloccate — sblocca dalle impostazioni del browser.
            </p>
          </div>
        )}

      </PopoverContent>
    </Popover>
  );
}
