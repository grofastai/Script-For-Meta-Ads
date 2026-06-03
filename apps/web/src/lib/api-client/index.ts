import type { ScriptInput, ScriptOutput, Hook, HookCreateInput, Campaign, CampaignCreateInput } from '@scriptsite/shared/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options
  const res = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((fetchOptions.headers as Record<string, string>) ?? {}),
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error((error as { detail?: string }).detail ?? `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

export interface HookFilters {
  niche?: string
  city?: string
  hook_type?: string
}

export const apiClient = {
  health: () =>
    apiFetch<{ status: string; version: string }>('/health'),

  generateScript: (input: ScriptInput, token: string) =>
    apiFetch<ScriptOutput>('/generate/script', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),

  getHooks: (filters: HookFilters, token: string) => {
    const params = new URLSearchParams()
    if (filters.niche) params.set('niche', filters.niche)
    if (filters.city) params.set('city', filters.city)
    if (filters.hook_type) params.set('hook_type', filters.hook_type)
    const qs = params.toString()
    return apiFetch<Hook[]>(`/hooks${qs ? `?${qs}` : ''}`, { token })
  },

  addHook: (input: HookCreateInput, token: string) =>
    apiFetch<Hook>('/hooks', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),

  logCampaign: (input: CampaignCreateInput, token: string) =>
    apiFetch<Campaign>('/analytics/campaign', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),

  getCampaigns: (token: string) =>
    apiFetch<Campaign[]>('/analytics/campaigns', { token }),

  getCampaign: (id: string, token: string) =>
    apiFetch<Campaign>(`/analytics/campaign/${id}`, { token }),
}
