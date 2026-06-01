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
