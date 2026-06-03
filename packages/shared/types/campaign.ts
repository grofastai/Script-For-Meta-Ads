export interface CampaignResult {
  script_id: string;
  business_id: string;
  goal: string;
  reach: number;
  leads: number;
  cost: number;
  cpl?: number;
  notes?: string;
}

export interface Campaign {
  id: string;
  org_id: string;
  script_id: string | null;
  business_id: string | null;
  goal: string;
  reach: number;
  leads: number;
  cost: number;
  cpl: number | null;
  notes: string | null;
  created_at: string;
}

export interface CampaignCreateInput {
  script_id?: string;
  business_id?: string;
  goal: string;
  reach: number;
  leads: number;
  cost: number;
  notes?: string;
}

export interface PerformanceMetrics {
  total_scripts: number;
  avg_cpl: number;
  best_hook_type: string;
  best_city: string;
  top_performing_scripts: Array<{
    script_id: string;
    leads: number;
    cpl: number;
  }>;
}
