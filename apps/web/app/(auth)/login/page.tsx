import Link from "next/link"

import { LoginForm } from "@/components/auth/auth-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FieldDescription } from "@workspace/ui/components/field"

export const metadata = { title: "Log in" }

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-2xl">Welcome back</h1>
        </CardTitle>
        <CardDescription>
          Log in to see your deliveries and ask the Brew Assistant. This is a
          demo: any email and password will do.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm
          footer={
            <FieldDescription className="text-center">
              New to Nightjar? <Link href="/signup">Create an account</Link>
            </FieldDescription>
          }
        />
      </CardContent>
    </Card>
  )
}
