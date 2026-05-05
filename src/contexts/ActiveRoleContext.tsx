import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "contributor" | "investor" | "admin" | "travel_client";
export type ActiveRole = "contributor" | "investor";

const STORAGE_KEY = "amana.activeRole";

interface ActiveRoleContextValue {
  roles: AppRole[];
  hasContributor: boolean;
  hasInvestor: boolean;
  activeRole: ActiveRole;
  setActiveRole: (role: ActiveRole) => void;
  switchRole: () => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ActiveRoleContext = createContext<ActiveRoleContextValue | null>(null);

export const ActiveRoleProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<ActiveRole>("contributor");
  const [loading, setLoading] = useState(true);

  const loadRoles = useCallback(async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const list = (data?.map((r) => r.role) || []) as AppRole[];
    setRoles(list);
    // Validate stored active role
    const stored = (localStorage.getItem(STORAGE_KEY) as ActiveRole | null) || "contributor";
    const next: ActiveRole =
      stored === "investor" && list.includes("investor") ? "investor" : "contributor";
    setActiveRoleState(next);
    localStorage.setItem(STORAGE_KEY, next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);
      loadRoles(session.user.id);
      channel = supabase
        .channel(`user-roles-${session.user.id}`)
        .on("postgres_changes", {
          event: "*", schema: "public", table: "user_roles",
          filter: `user_id=eq.${session.user.id}`,
        }, () => loadRoles(session.user.id))
        .subscribe();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) { setUserId(session.user.id); loadRoles(session.user.id); }
      else { setRoles([]); setUserId(null); setLoading(false); }
    });
    return () => { subscription.unsubscribe(); if (channel) supabase.removeChannel(channel); };
  }, [loadRoles]);

  const setActiveRole = useCallback((role: ActiveRole) => {
    if (role === "investor" && !roles.includes("investor")) return;
    setActiveRoleState(role);
    localStorage.setItem(STORAGE_KEY, role);
  }, [roles]);

  const switchRole = useCallback(() => {
    const next: ActiveRole = activeRole === "contributor" ? "investor" : "contributor";
    setActiveRole(next);
  }, [activeRole, setActiveRole]);

  const refresh = useCallback(async () => { if (userId) await loadRoles(userId); }, [userId, loadRoles]);

  return (
    <ActiveRoleContext.Provider value={{
      roles,
      hasContributor: roles.includes("contributor"),
      hasInvestor: roles.includes("investor"),
      activeRole,
      setActiveRole,
      switchRole,
      loading,
      refresh,
    }}>
      {children}
    </ActiveRoleContext.Provider>
  );
};

export const useActiveRole = () => {
  const ctx = useContext(ActiveRoleContext);
  if (!ctx) throw new Error("useActiveRole must be used within ActiveRoleProvider");
  return ctx;
};
