export interface Hook {
  id: string;
  text: string;
  language: string;
  niche: string;
  city: string | null;
  hook_type: string | null;
  source: 'manual' | 'scraped' | 'generated';
  use_count: number;
  saturation_score: number;
  performance_score: number;
  last_used_at: string | null;
  created_at: string;
}

export interface HookCreateInput {
  text: string;
  language?: string;
  niche: string;
  city?: string;
  hook_type?: string;
}

export type HookType = 'curiosity' | 'urgency' | 'local' | 'problem-solution' | 'social-proof';
