import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDealership } from "@/contexts/DealershipContext";
import { toast } from "sonner";

export interface SavedView {
  id: string;
  name: string;
  report_type: string;
  filters_json: Record<string, any>;
  sort_json: Record<string, any>;
  is_default: boolean;
}

export function useSavedViews(reportType: string) {
  const { user } = useAuth();
  const { currentDealership } = useDealership();
  const queryClient = useQueryClient();

  const { data: views = [] } = useQuery({
    queryKey: ["saved-views", reportType, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_report_views")
        .select("*")
        .eq("user_id", user.id)
        .eq("report_type", reportType)
        .order("name");
      if (error) throw error;
      return data as unknown as SavedView[];
    },
    enabled: !!user,
  });

  const saveView = useMutation({
    mutationFn: async ({ name, filters, sort }: { name: string; filters: Record<string, any>; sort: Record<string, any> }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("saved_report_views").insert({
        user_id: user.id,
        dealership_id: currentDealership?.id ?? null,
        report_type: reportType,
        name,
        filters_json: filters,
        sort_json: sort,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views"] });
      toast.success("View saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteView = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_report_views").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views"] });
      toast.success("View deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { views, saveView, deleteView };
}
