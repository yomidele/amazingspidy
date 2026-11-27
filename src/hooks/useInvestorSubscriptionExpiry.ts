import { useEffect, useState } from "react";
import {
  INVESTOR_SUBSCRIPTION_EXPIRES_AT,
  isInvestorSubscriptionExpired,
} from "@/lib/investorSubscription";

const MAX_TIMEOUT_MS = 2_147_000_000;

export const useInvestorSubscriptionExpiry = () => {
  const [expired, setExpired] = useState(() => isInvestorSubscriptionExpired());

  useEffect(() => {
    let timer: number | undefined;

    const refreshExpiry = () => {
      if (timer !== undefined) window.clearTimeout(timer);

      const now = Date.now();
      const isExpired = isInvestorSubscriptionExpired(now);
      setExpired(isExpired);

      if (!isExpired) {
        timer = window.setTimeout(
          refreshExpiry,
          Math.min(INVESTOR_SUBSCRIPTION_EXPIRES_AT - now, MAX_TIMEOUT_MS),
        );
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshExpiry();
    };

    refreshExpiry();
    window.addEventListener("focus", refreshExpiry);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      window.removeEventListener("focus", refreshExpiry);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  return expired;
};