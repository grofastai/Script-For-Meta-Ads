'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { ScriptOutput } from '@scriptsite/shared/types'

const NICHES = [
  { value: 'optical', label: 'Optical Store' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospital', label: 'Hospital / Clinic' },
  { value: 'education', label: 'Education / Coaching' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'agency', label: 'Agency' },
]

const CITIES = [
  { value: 'dharmapuri', label: 'Dharmapuri' },
  { value: 'krishnagiri', label: 'Krishnagiri' },
  { value: 'salem', label: 'Salem' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'coimbatore', label: 'Coimbatore' },
  { value: 'hosur', label: 'Hosur' },
  { value: 'karimangalam', label: 'Karimangalam' },
  { value: 'palacode', label: 'Palacode' },
]

const GOALS = [
  { value: 'leads', label: 'Lead Generation' },
  { value: 'reach', label: 'Reach / Brand Awareness' },
  { value: 'sales', label: 'Direct Sales' },
  { value: 'engagement', label: 'Engagement' },
]

const LANGUAGES = [
  { value: 'tanglish', label: 'Tanglish (Tamil + English)' },
  { value: 'tamil', label: 'Tamil' },
  { value: 'english', label: 'English' },
]

interface Props {
  onResult: (result: ScriptOutput) => void
  onLoading: (loading: boolean) => void
}

export function GeneratorForm({ onResult, onLoading }: Props) {
  const [form, setForm] = useState({
    niche: 'optical',
    city: 'dharmapuri',
    target_audience: '',
    offer: '',
    goal: 'leads',
    language: 'tanglish',
    business_name: '',
  })
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    onLoading(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')

      const result = await apiClient.generateScript(
        {
          business_id: '',
          niche: form.niche as any,
          city: form.city as any,
          target_audience: form.target_audience,
          offer: form.offer,
          goal: form.goal as any,
          language: form.language as any,
        },
        session.access_token,
      )
      onResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      onLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Script</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business Type</Label>
              <select
                value={form.niche}
                onChange={(e) => set('niche', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {NICHES.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <select
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Business Name (optional)</Label>
            <Input
              placeholder="e.g. Vision Care Optical"
              value={form.business_name}
              onChange={(e) => set('business_name', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Target Audience</Label>
            <Input
              placeholder="e.g. Adults 25-45 with vision problems"
              value={form.target_audience}
              onChange={(e) => set('target_audience', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Offer / Promotion</Label>
            <Input
              placeholder="e.g. Free eye checkup + 20% off all frames"
              value={form.offer}
              onChange={(e) => set('offer', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campaign Goal</Label>
              <select
                value={form.goal}
                onChange={(e) => set('goal', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {GOALS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <select
                value={form.language}
                onChange={(e) => set('language', e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full">
            Generate Script
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
