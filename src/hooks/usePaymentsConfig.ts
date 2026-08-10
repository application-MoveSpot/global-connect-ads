import { useEffect, useState } from "react";
import { getPaymentsConfig } from "@/lib/stripe";
import type { StripePublicConfig } from "@/lib/stripe-config.functions";

export function usePaymentsConfig() {
  const [config, setConfig] = useState<StripePublicConfig | null>(null);

  useEffect(() => {
    let active = true;
    getPaymentsConfig().then((c) => {
      if (active) setConfig(c);
    });
    return () => {
      active = false;
    };
  }, []);

  return config;
}
