'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ScriptOutput, HookVariant } from '@scriptsite/shared/types'

interface Props {
  output: ScriptOutput
}

export function ScriptOutput({ output }: Props) {
  const [selectedHook, setSelectedHook] = useState<HookVariant>(output.selected_hook)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hook Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {output.hooks.map((hook, i) => (
            <button
              key={i}
              onClick={() => setSelectedHook(hook)}
              className={`w-full text-left p-3 rounded-md border text-sm transition-colors ${
                selectedHook.text === hook.text
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span>{hook.text}</span>
                <div className="flex gap-1 shrink-0">
                  <Badge variant="secondary">{hook.type}</Badge>
                  <Badge variant="outline">{Math.round(hook.freshness_score * 100)}% fresh</Badge>
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Full Script</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm text-zinc-700 font-sans leading-relaxed">
            {output.script}
          </pre>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CTA</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{output.cta}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Best Posting Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{output.posting_time}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Caption</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{output.caption}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hashtags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {output.hashtags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad Copy</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{output.ad_copy}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shot List</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1 text-sm text-zinc-700 list-decimal list-inside">
            {output.shot_list.map((shot, i) => (
              <li key={i}>{shot}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
