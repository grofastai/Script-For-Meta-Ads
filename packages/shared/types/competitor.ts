export interface OfferAnalysisRequest {
  offer: string
  niche: string
  city?: string
  goal?: string
}

export interface OfferAnalysisResult {
  strength_score: number
  whats_working: string[]
  whats_missing: string[]
  improved_offers: string[]
  recommended_hook_types: string[]
}

export interface CompetitorRequest {
  instagram_handle: string
  niche?: string
}

export interface PostSummary {
  caption_preview: string
  likes: number
  estimated_views: number
}

export interface CompetitorResult {
  handle: string
  posts_analyzed: number
  avg_likes: number
  top_content_types: string[]
  best_posts: PostSummary[]
  recommended_strategy: string
  strengths: string[]
  gaps: string[]
}
