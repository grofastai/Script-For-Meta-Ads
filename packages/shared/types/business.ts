export type NicheCategory =
  | 'optical'
  | 'real-estate'
  | 'hospital'
  | 'education'
  | 'restaurant'
  | 'clothing'
  | 'jewellery'
  | 'pharmacy'
  | 'agency';

export type CityName =
  | 'dharmapuri'
  | 'krishnagiri'
  | 'salem'
  | 'chennai'
  | 'coimbatore'
  | 'hosur'
  | 'karimangalam'
  | 'palacode';

export type CampaignGoal = 'reach' | 'leads' | 'sales' | 'engagement';

export type Language = 'tanglish' | 'english' | 'tamil';

export interface Business {
  id: string;
  org_id: string;
  name: string;
  niche: NicheCategory;
  city: CityName;
  target_audience?: string;
  created_at: string;
}
