// Placeholder from the Playground foundation (#23). #26 replaces this page.
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

export const metadata = { title: "Log in" }

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-2xl">Welcome back</h1>
        </CardTitle>
        <CardDescription>
          The login form arrives with the auth screens.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
