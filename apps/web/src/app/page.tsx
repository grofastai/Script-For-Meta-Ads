import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ScriptSite</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 mb-4">
            AI Viral Script Intelligence Platform
          </p>
          <Button>Get Started</Button>
        </CardContent>
      </Card>
    </main>
  )
}
