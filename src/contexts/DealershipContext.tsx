import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Database } from "@/integrations/supabase/types";

type Dealership = Database["public"]["Tables"]["dealerships"]["Row"];

interface DealershipContextType {
  dealerships: Dealership[];
  currentDealership: Dealership | null;
  setCurrentDealership: (d: Dealership) => void;
  loading: boolean;
}

const DealershipContext = createContext<DealershipContextType | undefined>(undefined);

export function DealershipProvider({ children }: { children: ReactNode }) {
  const { user, profile, isPlatformAdmin } = useAuth();
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [currentDealership, setCurrentDealership] = useState<Dealership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setDealerships([]);
      setCurrentDealership(null);
      setLoading(false);
      return;
    }

    const fetchDealerships = async () => {
      setLoading(true);
      let query = supabase.from("dealerships").select("*").order("name");
      
      // RLS handles filtering — platform admins see all, others see assigned only
      const { data } = await query;
      const list = data ?? [];
      setDealerships(list);

      // Set default
      if (list.length > 0 && !currentDealership) {
        const defaultId = profile?.default_dealership_id;
        const def = defaultId ? list.find((d) => d.id === defaultId) : null;
        setCurrentDealership(def ?? list[0]);
      }
      setLoading(false);
    };

    fetchDealerships();
  }, [user, profile, isPlatformAdmin]);

  return (
    <DealershipContext.Provider value={{ dealerships, currentDealership, setCurrentDealership, loading }}>
      {children}
    </DealershipContext.Provider>
  );
}

export function useDealership() {
  const ctx = useContext(DealershipContext);
  if (!ctx) throw new Error("useDealership must be used within DealershipProvider");
  return ctx;
}
