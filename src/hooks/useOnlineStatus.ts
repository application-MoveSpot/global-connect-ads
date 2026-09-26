import { useState, useEffect } from "react";

export function useOnlineStatus() {
  // Start as true — never show the banner on initial render.
  // Only flip to false when the browser explicitly fires "offline".
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online",  up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}
