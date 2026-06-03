import { CampaignTracker } from '@/components/campaigns/CampaignTracker'

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-zinc-500 text-sm">
          Log actual campaign results to track performance and improve hook scoring.
        </p>
      </div>
      <CampaignTracker />
    </div>
  )
}
