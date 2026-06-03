'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { apiClient } from '@/lib/api-client'
import type { Campaign } from '@scriptsite/shared/types'

const GOALS = [
  { value: 'leads', label: 'Lead Generation' },
  { value: 'reach', label: 'Reach / Brand Awareness' },
  { value: 'sales', label: 'Direct Sales' },
  { value: 'engagement', label: 'Engagement' },
]

function goalBadgeVariant(goal: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (goal) {
    case 'leads': return 'default'
    case 'sales': return 'destructive'
    case 'reach': return 'secondary'
    default: return 'outline'
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function computeSummary(campaigns: Campaign[]) {
  if (campaigns.length === 0) return null
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0)
  const withCpl = campaigns.filter((c) => c.cpl !== null && c.cpl > 0)
  const avgCpl = withCpl.length > 0
    ? withCpl.reduce((s, c) => s + (c.cpl ?? 0), 0) / withCpl.length
    : null
  const best = [...campaigns].sort((a, b) => b.leads - a.leads)[0]
  return { totalLeads, avgCpl, best }
}

export function CampaignTracker() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    script_id: '',
    goal: 'leads',
    reach: '',
    leads: '',
    cost: '',
    notes: '',
  })
  const [logging, setLogging] = useState(false)
  const [logError, setLogError] = useState('')

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      const data = await apiClient.getCampaigns(session.access_token)
      setCampaigns(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  async function handleLog(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true)
    setLogError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not signed in')
      await apiClient.logCampaign(
        {
          script_id: form.script_id.trim() || undefined,
          goal: form.goal,
          reach: parseInt(form.reach) || 0,
          leads: parseInt(form.leads) || 0,
          cost: parseFloat(form.cost) || 0,
          notes: form.notes.trim() || undefined,
        },
        session.access_token,
      )
      setForm({ script_id: '', goal: 'leads', reach: '', leads: '', cost: '', notes: '' })
      setShowForm(false)
      try {
        await fetchCampaigns()
      } catch {
        // fetchCampaigns sets its own error state
      }
    } catch (err) {
      setLogError(err instanceof Error ? err.message : 'Failed to log campaign')
    } finally {
      setLogging(false)
    }
  }

  const summary = computeSummary(campaigns)

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Avg CPL</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {summary.avgCpl !== null ? `₹${summary.avgCpl.toFixed(0)}` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500">Best Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.best.leads} leads</p>
              <p className="text-xs text-zinc-400">{summary.best.goal}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setShowForm((v) => !v); setLogError('') }}
        >
          {showForm ? 'Cancel' : '+ Log Campaign Results'}
        </Button>
      </div>

      {/* Log form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Log Campaign Results</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLog} className="space-y-3">
              <div className="space-y-1">
                <Label>Script ID (optional)</Label>
                <Input
                  placeholder="Paste the script_id from the generated script"
                  value={form.script_id}
                  onChange={(e) => setForm((f) => ({ ...f, script_id: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <div className="space-y-1">
                  <Label className="text-xs">Reach</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={form.reach}
                    onChange={(e) => setForm((f) => ({ ...f, reach: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Leads</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 12"
                    value={form.leads}
                    onChange={(e) => setForm((f) => ({ ...f, leads: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ad Spend (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={form.cost}
                    onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Input
                  placeholder="Any observations about this campaign"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {logError && <p className="text-sm text-red-500">{logError}</p>}
              <Button type="submit" size="sm" disabled={logging}>
                {logging ? 'Logging...' : 'Log Results'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Campaign list */}
      {loading && (
        <div className="text-center py-12 text-zinc-400 text-sm">Loading campaigns...</div>
      )}
      {!loading && error && (
        <div className="text-center py-12 text-red-500 text-sm">{error}</div>
      )}
      {!loading && !error && campaigns.length === 0 && (
        <div className="text-center py-12 text-zinc-400 text-sm">
          No campaigns logged yet. Run an ad using a generated script, then log the results above.
        </div>
      )}
      {!loading && !error && campaigns.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-400">{campaigns.length} campaigns</p>
          {campaigns.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={goalBadgeVariant(c.goal)}>{c.goal}</Badge>
                      {c.script_id && (
                        <span className="text-xs text-zinc-400 font-mono truncate max-w-[160px]">
                          script: {c.script_id.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                    {c.notes && (
                      <p className="text-sm text-zinc-600">{c.notes}</p>
                    )}
                    <p className="text-xs text-zinc-400">{formatDate(c.created_at)}</p>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-0.5">
                    <p className="text-sm font-semibold">{c.leads} leads</p>
                    <p className="text-xs text-zinc-500">
                      Reach: <span className="text-zinc-800">{c.reach.toLocaleString()}</span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      CPL:{' '}
                      <span className="text-zinc-800">
                        {c.cpl !== null ? `₹${c.cpl.toFixed(0)}` : '—'}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Spend:{' '}
                      <span className="text-zinc-800">₹{c.cost.toFixed(0)}</span>
                    </p>
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
