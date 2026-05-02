import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function showBrowserNotification(n: AppNotification) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const notif = new Notification(n.title, {
    body: n.body ?? undefined,
    icon: '/favicon.ico',
    tag: n.id,
  });
  notif.onclick = () => { window.focus(); notif.close(); };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data as AppNotification[]) || []);
    setLoading(false);
  }, [user]);

  // Optimistic: aggiorna la UI subito, salva nel DB in background
  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    supabase.from('notifications').update({ read: true }).eq('id', id);
  }, []);

  const markAsUnread = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
    supabase.from('notifications').update({ read: false }).eq('id', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  }, [user]);

  // Optimistic: rimuove dalla lista immediatamente, cancella nel DB in background
  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    supabase.from('notifications').delete().eq('id', id);
  }, []);

  const deleteAllRead = useCallback(async () => {
    if (!user) return;
    setNotifications(prev => prev.filter(n => !n.read));
    supabase.from('notifications').delete().eq('user_id', user.id).eq('read', true);
  }, [user]);

  const requestPushPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPushPermission(result);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications(prev => [n, ...prev]);
          toast(n.title, { description: n.body ?? undefined });
          if (document.visibilityState !== 'visible') {
            showBrowserNotification(n);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    pushPermission,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    requestPushPermission,
  };
}
