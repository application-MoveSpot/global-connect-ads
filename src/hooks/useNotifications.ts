import { useState, useCallback, useEffect } from "react";
import { showBrowserNotification } from "@/lib/notifications/browser";
import { supabase } from "@/integrations/supabase/client";

export type AppNotification = {
  id: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
  href?: string;
};

const STORAGE_KEY = "movespot_notifications_v1";
const MAX = 30;
const BUS_EVENT = "movespot:notification:update";

function load(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function save(ns: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ns));
  } catch {
    // storage unavailable
  }
}

/** Push a notification from anywhere — no React context needed. */
export function pushNotification(title: string, body?: string, href?: string) {
  const n: AppNotification = {
    id: crypto.randomUUID(),
    title,
    body,
    timestamp: Date.now(),
    read: false,
    href,
  };
  const current = load();
  const next = [n, ...current].slice(0, MAX);
  save(next);
  showBrowserNotification(title, body);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(BUS_EVENT));
  }
}

type DbNotification = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  dismissed_at: string | null;
  created_at: string;
};

function dbNotifToApp(n: DbNotification): AppNotification {
  return {
    id: `db-${n.id}`,
    title: n.title,
    body: n.body ?? undefined,
    href: n.href ?? undefined,
    timestamp: new Date(n.created_at).getTime(),
    read: false,
  };
}

/** Hook for displaying the notification list (bell component). */
export function useNotifications() {
  const [list, setList] = useState<AppNotification[]>(load);

  // Merge server-side notifications from user_notifications table
  useEffect(() => {
    let cancelled = false;
    async function fetchDbNotifs() {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session || cancelled) return;

        const { data } = await supabase
          .from("user_notifications")
          .select("id, user_id, kind, title, body, href, dismissed_at, created_at")
          .is("dismissed_at", null)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!data || cancelled) return;

        const dbItems: AppNotification[] = (data as DbNotification[]).map(dbNotifToApp);

        setList((prev) => {
          const dbIds = new Set(dbItems.map((n) => n.id));
          const merged = [...dbItems, ...prev.filter((n) => !dbIds.has(n.id))].slice(0, MAX);
          save(merged);
          return merged;
        });
      } catch {
        // Supabase unavailable — keep local list as-is
      }
    }
    fetchDbNotifs();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = () => setList(load());
    window.addEventListener(BUS_EVENT, handler);
    return () => window.removeEventListener(BUS_EVENT, handler);
  }, []);

  const markAllRead = useCallback(() => {
    setList((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      save(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setList([]);
    save([]);
  }, []);

  const unreadCount = list.filter((n) => !n.read).length;

  return { notifications: list, markAllRead, clearAll, unreadCount };
}
