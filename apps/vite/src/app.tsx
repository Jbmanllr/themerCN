import { Button } from "@workspace/ui/components/button"

export function App() {
  return (
    <main className="flex min-h-svh flex-col items-start gap-4 p-6 text-sm">
      <h1 className="font-medium">Vite app</h1>
      <p className="text-muted-foreground">
        A React-only workspace that renders @workspace/ui components.
      </p>
      <Button>Button</Button>
    </main>
  )
}
