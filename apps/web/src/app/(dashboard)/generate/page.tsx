'use client'

import { useState } from 'react'
import { GeneratorForm } from '@/components/generate/GeneratorForm'
import { ScriptOutput } from '@/components/generate/ScriptOutput'
import type { ScriptOutput as ScriptOutputType } from '@scriptsite/shared/types'

export default function GeneratePage() {
  const [result, setResult] = useState<ScriptOutputType | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Generate Script</h1>
        <p className="text-zinc-500 text-sm">
          Fill in the details below to generate a viral script for your client.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <GeneratorForm onResult={setResult} onLoading={setLoading} />
        </div>

        <div>
          {loading && (
            <div className="flex items-center justify-center h-64 border rounded-lg bg-zinc-50">
              <p className="text-zinc-500 text-sm animate-pulse">Generating your script...</p>
            </div>
          )}
          {!loading && result && <ScriptOutput output={result} />}
          {!loading && !result && (
            <div className="flex items-center justify-center h-64 border rounded-lg bg-zinc-50 border-dashed">
              <p className="text-zinc-400 text-sm">Your generated script will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
