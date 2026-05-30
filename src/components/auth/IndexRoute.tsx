import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Index from "@/pages/Index";

/**
 * Root route: shows the public homepage to logged-out visitors, but
 * redirects logged-in users to their best-matching dashboard.
 */
const IndexRoute = () => {
  const { session, loading } = useAuth();
  const [target, setTarget] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (loading || !session) return;
    let cancelled = false;
    setResolving(true);
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (cancelled) return;
      const list = (roles ?? []).map((r: any) => r.role);
      // Priority: admin -> contributor (default for dual-role users) -> investor -> travel
      let next = "/dashboard/contributor";
      if (list.includes("admin")) next = "/admin";
      else if (list.includes("contributor")) next = "/dashboard/contributor";
      else if (list.includes("investor")) next = "/investor-dashboard";
      else if (list.includes("travel")) next = "/dashboard/travel";
      setTarget(next);
      setResolving(false);
    })();
    return () => { cancelled = true; };
  }, [loading, session]);

  if (loading || (session && resolving)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session && target) {
    return <Navigate to={target} replace />;
  }

  return <Index />;
};

export default IndexRoute;
