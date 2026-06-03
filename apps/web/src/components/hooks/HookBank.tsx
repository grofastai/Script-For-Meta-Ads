'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { Hook } from '@scriptsite/shared/types'

const NICHES = [
  { value: '', label: 'All niches' },
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

const CITIES = [
  { value: '', label: 'All cities' },
  { value: 'dharmapuri', label: 'Dharmapuri' },
  { value: 'krishnagiri', label: 'Krishnagiri' },
  { value: 'salem', label: 'Salem' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'coimbatore', label: 'Coimbatore' },
  { value: 'hosur', label: 'Hosur' },
  { value: 'karimangalam', label: 'Karimangalam' },
  { value: 'palacode', label: 'Palacode' },
]

const HOOK_TYPES = [
  { value: '', label: 'All types' },
  { value: 'curiosity', label: 'Curiosity' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'local', label: 'Local' },
  { value: 'problem-solution', label: 'Problem-Solution' },
  { value: 'social-proof', label: 'Social Proof' },
]

function freshnessColor(saturation: number) {
  const freshness = 1 - saturation
  if (freshness >= 0.7) return 'bg-green-500'
  if (freshness >= 0.3) return 'bg-yellow-400'
  return 'bg-red-500'
}

function freshnessLabel(saturation: number) {
  const freshness = 1 - saturation
  if (freshness >= 0.7) return 'Fresh'
  if (freshness >= 0.3) return 'Moderate'
  return 'Saturated'
}

function hookTypeBadgeVariant(type: string | null): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'urgency': return 'destructive'
    case 'social-proof': return 'default'
    case 'curiosity': return 'secondary'
    default: return 'outline'
  }
}

export function HookBank() {
  const [hooks, setHooks] = useState<Hook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [niche, setNiche] = useState('')
  const [city, setCity] = useState('')
  const [hookType, setHookType] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    text: '',
    niche: 'optical',
    city: '',
    hook_type: '',
    language: 'tanglish',
  })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const fetchHooks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const data = await apiClient.getHooks(
        { niche: niche || undefined, city: city || undefined, hook_type: hookType || undefined },
        session.access_token,
      )
      setHooks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hooks')
    } finally {
      setLoading(false)
    }
  }, [niche, city, hookType])

  useEffect(() => {
    fetchHooks()
  }, [fetchHooks])

  async function handleAddHook(e: React.FormEvent) {
    e.preventDefault()
    if (!addForm.text.trim()) return
    setAdding(true)
    setAddError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      await apiClient.addHook(
        {
          text: addForm.text.trim(),
          niche: addForm.niche,
          city: addForm.city || undefined,
          hook_type: addForm.hook_type || undefined,
          language: addForm.language,
        },
        session.access_token,
      )
      setAddForm({ text: '', niche: 'optical', city: '', hook_type: '', language: 'tanglish' })
      setShowAddForm(false)
      await fetchHooks()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add hook')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Niche</Label>
              <select
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {NICHES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">City</Label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <select
                value={hookType}
                onChange={(e) => setHookType(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {HOOK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm((v) => !v)}
              >
                {showAddForm ? 'Cancel' : '+ Add Hook'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Hook Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Hook Manually</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddHook} className="space-y-3">
              <div className="space-y-1">
                <Label>Hook Text</Label>
                <Input
                  placeholder="e.g. Dharmapuri la innum neraya per indha mistake pannitu irukanga..."
                  value={addForm.text}
                  onChange={(e) => setAddForm((f) => ({ ...f, text: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Niche</Label>
                  <select
                    value={addForm.niche}
                    onChange={(e) => setAddForm((f) => ({ ...f, niche: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    {NICHES.filter((n) => n.value).map((n) => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">City (optional)</Label>
                  <select
                    value={addForm.city}
                    onChange={(e) => setAddForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    {CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type (optional)</Label>
                  <select
                    value={addForm.hook_type}
                    onChange={(e) => setAddForm((f) => ({ ...f, hook_type: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    {HOOK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <select
                    value={addForm.language}
                    onChange={(e) => setAddForm((f) => ({ ...f, language: e.target.value }))}
                    className="w-full border rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="tanglish">Tanglish</option>
                    <option value="tamil">Tamil</option>
                    <option value="english">English</option>
                  </select>
                </div>
              </div>
              {addError && <p className="text-sm text-red-500">{addError}</p>}
              <Button type="submit" size="sm" disabled={adding}>
                {adding ? 'Adding...' : 'Add Hook'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Hook List */}
      {loading && (
        <div className="text-center py-12 text-zinc-400 text-sm">Loading hooks...</div>
      )}
      {!loading && error && (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      )}
      {!loading && !error && hooks.length === 0 && (
        <div className="text-center py-12 text-zinc-400 text-sm">
          No hooks found. Add one above or generate scripts to populate the bank.
        </div>
      )}
      {!loading && !error && hooks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">{hooks.length} hooks</p>
          {hooks.map((hook) => (
            <Card key={hook.id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  {/* Freshness dot */}
                  <div className="mt-1.5 flex-shrink-0">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${freshnessColor(hook.saturation_score)}`}
                      title={freshnessLabel(hook.saturation_score)}
                    />
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{hook.text}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {hook.hook_type && (
                        <Badge variant={hookTypeBadgeVariant(hook.hook_type)}>
                          {hook.hook_type}
                        </Badge>
                      )}
                      <Badge variant="outline">{hook.niche}</Badge>
                      {hook.city && <Badge variant="outline">{hook.city}</Badge>}
                      <Badge variant="outline">{hook.source}</Badge>
                    </div>
                  </div>
                  {/* Stats */}
                  <div className="flex-shrink-0 text-right space-y-0.5">
                    <p className="text-xs text-zinc-500">
                      Freshness:{' '}
                      <span className="font-medium text-zinc-800">
                        {Math.round((1 - hook.saturation_score) * 100)}%
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Score:{' '}
                      <span className="font-medium text-zinc-800">
                        {Math.round(hook.performance_score * 100)}%
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400">Used {hook.use_count}×</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
