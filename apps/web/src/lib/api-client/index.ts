import type { ScriptInput, ScriptOutput } from '@scriptsite/shared/types'

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

export const apiClient = {
  health: () =>
    apiFetch<{ status: string; version: string }>('/health'),

  generateScript: (input: ScriptInput, token: string) =>
    apiFetch<ScriptOutput>('/generate/script', {
      method: 'POST',
      body: JSON.stringify(input),
      token,
    }),
}
