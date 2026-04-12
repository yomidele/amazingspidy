import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useInvestorModuleStatus = () => {
  const [status, setStatus] = useState<"active" | "inactive" | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    const { data } = await supabase
      .from("admin_settings")
      .select("investor_module_status")
      .eq("setting_key", "investment_interest")
      .maybeSingle();
    setStatus((data?.investor_module_status as "active" | "inactive") || "inactive");
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return { status, loading, refetch: fetchStatus };
};
