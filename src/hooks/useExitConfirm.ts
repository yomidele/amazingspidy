import { useEffect, useRef } from "react";
import { useLogoutConfirm } from "@/components/shared/LogoutConfirmProvider";

/**
 * Intercepts the browser back button on a dashboard route and prompts
 * the user (via the global styled logout dialog) to confirm logout
 * instead of silently exiting / logging out.
 */
export const useExitConfirm = (
  onConfirmExit: () => void | Promise<void>,
  options: { message?: string; enabled?: boolean } = {}
) => {
  const { enabled = true } = options;
  const armedRef = useRef(false);
  const { confirmLogout } = useLogoutConfirm();

  useEffect(() => {
    if (!enabled) return;

    // Push a sentinel state so the next back press fires popstate
    // without leaving the SPA.
    window.history.pushState({ __exitGuard: true }, "");
    armedRef.current = true;

    const handlePop = (_e: PopStateEvent) => {
      if (!armedRef.current) return;
      // Re-arm immediately so cancel keeps the user on the dashboard.
      window.history.pushState({ __exitGuard: true }, "");
      confirmLogout(() => {
        armedRef.current = false;
        return onConfirmExit();
      });
    };

    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      armedRef.current = false;
    };
  }, [enabled, confirmLogout, onConfirmExit]);
};
