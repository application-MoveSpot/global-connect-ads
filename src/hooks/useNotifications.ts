import { useState, useCallback, useEffect } from "react";
import { showBrowserNotification } from "@/lib/notifications/browser";

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

/** Hook for displaying the notification list (bell component). */
export function useNotifications() {
  const [list, setList] = useState<AppNotification[]>(load);

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
