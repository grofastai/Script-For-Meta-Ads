import type { NicheCategory, CityName, CampaignGoal, Language } from './business';

export interface ScriptInput {
  business_id: string;
  niche: NicheCategory;
  city: CityName;
  target_audience: string;
  offer: string;
  budget?: number;
  goal: CampaignGoal;
  language: Language;
}

export type HookType = 'curiosity' | 'urgency' | 'local' | 'problem-solution' | 'social-proof';

export interface HookVariant {
  id?: string;
  text: string;
  type: HookType;
  freshness_score: number;
}

export interface ScriptOutput {
  hooks: HookVariant[];
  selected_hook: HookVariant;
  script: string;
  cta: string;
  caption: string;
  hashtags: string[];
  posting_time: string;
  ad_copy: string;
  video_structure: string;
  shot_list: string[];
}
