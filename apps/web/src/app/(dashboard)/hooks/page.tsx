import { HookBank } from '@/components/hooks/HookBank'

export default function HooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hook Bank</h1>
        <p className="text-zinc-500 text-sm">
          Browse, filter, and add hooks. Freshness indicator shows how often each hook has been used.
        </p>
      </div>
      <HookBank />
    </div>
  )
}
