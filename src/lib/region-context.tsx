import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type Region } from "@/lib/currency";

type RegionContextValue = {
  region: Region;
  setRegion: (r: Region) => void;
};

const RegionContext = createContext<RegionContextValue>({
  region: "europe",
  setRegion: () => {},
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<Region>("europe");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("movespot_region") as Region | null;
      if (stored && ["europe", "afrique", "asie", "amerique", "moyen_orient"].includes(stored)) {
        setRegionState(stored);
      }
    } catch {}
  }, []);

  function setRegion(r: Region) {
    setRegionState(r);
    try {
      localStorage.setItem("movespot_region", r);
    } catch {}
  }

  return <RegionContext.Provider value={{ region, setRegion }}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  return useContext(RegionContext);
}
