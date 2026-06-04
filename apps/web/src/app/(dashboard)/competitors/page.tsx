import { OfferAnalyzer } from '@/components/competitors/OfferAnalyzer'
import { CompetitorAnalyzer } from '@/components/competitors/CompetitorAnalyzer'

export default function CompetitorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Competitors &amp; Offers</h1>
        <p className="text-zinc-500 text-sm">
          Analyze your offer strength and research competitor Instagram strategies.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <OfferAnalyzer />
        <CompetitorAnalyzer />
      </div>
    </div>
  )
}
