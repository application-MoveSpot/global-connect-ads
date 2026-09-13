import { useState, useEffect, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { savePushSubscription, removePushSubscription, getVapidPublicKey } from "@/lib/notifications/push-subscribe.server";

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export type PushState = "unsupported" | "default" | "denied" | "subscribed" | "loading";

export function usePushSubscription(userId: string | null) {
  const [state, setState] = useState<PushState>("loading");
  const [publicKey, setPublicKey] = useState<string>("");
  const publicKeyRef = useRef<string>("");
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const fetchPublicKey = useServerFn(getVapidPublicKey);

  useEffect(() => {
    fetchPublicKey().then((res: { publicKey: string }) => {
      publicKeyRef.current = res.publicKey;
      setPublicKey(res.publicKey);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = useCallback(async () => {
    const key = publicKeyRef.current || publicKey;
    if (!key || !userId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const existing = await reg.pushManager.getSubscription();

      if (existing) {
        const keys = existing.toJSON().keys;
        if (keys) {
          await save({ endpoint: existing.endpoint, p256dh: keys.p256dh, auth: keys.auth });
        }
        setState("subscribed");
        return;
      }

      const permission = Notification.permission;
      if (permission === "denied") { setState("denied"); return; }

      setState(permission === "granted" ? "default" : "default");
    } catch {
      setState("unsupported");
    }
  }, [userId, save, publicKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) { setState("unsupported"); return; }
    void register();
  }, [register]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    const key = publicKeyRef.current || publicKey;
    if (!key || !userId) return false;
    try {
      setState("loading");
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return false; }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key) as unknown as BufferSource,
      });

      const keys = sub.toJSON().keys;
      if (!keys) { setState("default"); return false; }

      await save({
        endpoint: sub.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: navigator.userAgent.slice(0, 200),
      });

      setState("subscribed");
      return true;
    } catch {
      setState("default");
      return false;
    }
  }, [userId, save, publicKey]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await remove({ endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("default");
    } catch {
      setState("default");
    }
  }, [userId, remove]);

  return { state, subscribe, unsubscribe };
}
