'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { CompetitorResult } from '@scriptsite/shared/types'

const NICHES = [
  { value: '', label: 'Auto-detect' },
  { value: 'optical', label: 'Optical Store' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospital', label: 'Hospital / Clinic' },
  { value: 'education', label: 'Education' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'agency', label: 'Agency' },
]

export function CompetitorAnalyzer() {
  const [handle, setHandle] = useState('')
  const [niche, setNiche] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompetitorResult | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const cleanHandle = handle.trim().replace(/^@/, '')
      const data = await apiClient.analyzeCompetitor(
        { instagram_handle: cleanHandle, niche: niche || undefined },
        session.access_token,
      )
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Research</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Instagram Handle</Label>
              <Input
                placeholder="@competitor_handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Niche (optional)</Label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Pulls their top 10 posts via Apify and analyzes content patterns. Takes ~90 seconds.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Analyzing (this takes ~90s)...' : 'Analyze Competitor'}
          </Button>
        </form>

        {result && (
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <p className="text-xs text-zinc-500">Handle</p>
                <p className="font-semibold">@{result.handle}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Posts analyzed</p>
                <p className="font-semibold">{result.posts_analyzed}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Avg likes</p>
                <p className="font-semibold">{result.avg_likes.toLocaleString()}</p>
              </div>
            </div>

            {result.top_content_types.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Top content types</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.top_content_types.map((t) => (
                    <Badge key={t} variant="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Their strengths</p>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-zinc-700">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.gaps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">Their gaps (your opportunity)</p>
                <ul className="space-y-1">
                  {result.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-green-500 flex-shrink-0">→</span>{g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.best_posts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Top posts</p>
                <div className="space-y-2">
                  {result.best_posts.map((post, i) => (
                    <div key={i} className="border rounded-md px-3 py-2">
                      <p className="text-sm text-zinc-700 leading-snug">{post.caption_preview || '(no caption)'}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-zinc-400">{post.likes.toLocaleString()} likes</span>
                        <span className="text-xs text-zinc-400">{post.estimated_views.toLocaleString()} views</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommended_strategy && (
              <div className="bg-zinc-50 rounded-md px-4 py-3">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Recommended strategy</p>
                <p className="text-sm text-zinc-800">{result.recommended_strategy}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
