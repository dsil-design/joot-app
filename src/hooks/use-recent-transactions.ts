import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export interface RecentTransaction {
  id: string
  description: string | null
  amount: number
  original_currency: string
  created_at: string | null
  vendor: { name: string } | null
}

export function useRecentTransactions() {
  return useQuery({
    queryKey: ["sidebar-recent-transactions"],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, original_currency, created_at, vendor:vendors(name)")
        .order("created_at", { ascending: false })
        .limit(15)
      if (error) throw error
      return (data ?? []) as RecentTransaction[]
    },
    staleTime: 2 * 60 * 1000,
  })
}
