'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { OfferAnalysisResult } from '@scriptsite/shared/types'

const NICHES = [
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

const GOALS = [
  { value: 'leads', label: 'Lead Generation' },
  { value: 'reach', label: 'Reach' },
  { value: 'sales', label: 'Direct Sales' },
  { value: 'engagement', label: 'Engagement' },
]

function scoreColor(score: number) {
  if (score >= 7) return 'text-green-600'
  if (score >= 4) return 'text-yellow-600'
  return 'text-red-600'
}

export function OfferAnalyzer() {
  const [form, setForm] = useState({ offer: '', niche: 'optical', city: '', goal: 'leads' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OfferAnalysisResult | null>(null)
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
      const data = await apiClient.analyzeOffer(
        {
          offer: form.offer.trim(),
          niche: form.niche,
          city: form.city.trim() || undefined,
          goal: form.goal,
        },
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
        <CardTitle>Offer Analyzer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Your Offer</Label>
            <Input
              placeholder="e.g. Free eye checkup + 20% off all frames this week"
              value={form.offer}
              onChange={(e) => setForm((f) => ({ ...f, offer: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Niche</Label>
              <select
                value={form.niche}
                onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City (optional)</Label>
              <Input
                placeholder="e.g. Dharmapuri"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Goal</Label>
              <select
                value={form.goal}
                onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Offer'}
          </Button>
        </form>

        {result && (
          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500">Strength score:</span>
              <span className={`text-2xl font-bold ${scoreColor(result.strength_score)}`}>
                {result.strength_score.toFixed(1)}/10
              </span>
            </div>

            {result.whats_working.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">What's working</p>
                <ul className="space-y-1">
                  {result.whats_working.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.whats_missing.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">What's missing</p>
                <ul className="space-y-1">
                  {result.whats_missing.map((item, i) => (
                    <li key={i} className="text-sm text-zinc-700 flex gap-2">
                      <span className="text-red-400 flex-shrink-0">✗</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.improved_offers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Improved offers</p>
                <div className="space-y-2">
                  {result.improved_offers.map((offer, i) => (
                    <div key={i} className="bg-blue-50 rounded-md px-3 py-2 text-sm text-blue-900">
                      {i + 1}. {offer}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommended_hook_types.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-500">Recommended hooks:</span>
                {result.recommended_hook_types.map((t) => (
                  <Badge key={t} variant="secondary">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
