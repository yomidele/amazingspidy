import { useEffect, useRef } from "react";

/**
 * Intercepts the browser back button on a dashboard route and prompts
 * the user to confirm logout instead of silently exiting / logging out.
 *
 * Strategy:
 *  - Push a sentinel history entry on mount so the first "back" press
 *    pops that sentinel instead of leaving the dashboard.
 *  - On `popstate`, ask the user to confirm exit. If they cancel, we
 *    re-push the sentinel so they remain on the dashboard. If they
 *    confirm, we run the provided logout handler.
 *
 * This does NOT interfere with in-app navigation (clicking a link still
 * works normally). It only kicks in when the dashboard itself is the
 * top of the history stack and the user presses Back.
 */
export const useExitConfirm = (
  onConfirmExit: () => void | Promise<void>,
  options: { message?: string; enabled?: boolean } = {}
) => {
  const { message = "Do you want to logout?", enabled = true } = options;
  const armedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Push a sentinel state so the next back press fires popstate
    // without leaving the SPA.
    window.history.pushState({ __exitGuard: true }, "");
    armedRef.current = true;

    const handlePop = (_e: PopStateEvent) => {
      if (!armedRef.current) return;
      const confirmed = window.confirm(message);
      if (confirmed) {
        armedRef.current = false;
        Promise.resolve(onConfirmExit()).catch(() => {});
      } else {
        // Re-arm: push the sentinel again so we keep intercepting.
        window.history.pushState({ __exitGuard: true }, "");
      }
    };

    window.addEventListener("popstate", handlePop);
    return () => {
      window.removeEventListener("popstate", handlePop);
      armedRef.current = false;
    };
  }, [enabled, message, onConfirmExit]);
};
