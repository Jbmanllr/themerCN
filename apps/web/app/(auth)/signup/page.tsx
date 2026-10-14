import Link from "next/link"

import { AuthForm } from "@/components/auth/auth-form"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FieldDescription } from "@workspace/ui/components/field"

export const metadata = { title: "Create an account" }

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-2xl">Start brewing with us</h1>
        </CardTitle>
        <CardDescription>
          An account keeps your subscription, orders and brew notes in one
          place. This is a demo: nothing is saved.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AuthForm
          submitLabel="Create account"
          fields={[
            {
              name: "name",
              label: "Name",
              type: "text",
              autoComplete: "name",
              missing: "Enter your name.",
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              autoComplete: "email",
              placeholder: "you@example.com",
              missing: "Enter your email address.",
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              autoComplete: "new-password",
              description: "Any password works here.",
              missing: "Choose a password.",
            },
          ]}
          footer={
            <FieldDescription className="text-center">
              Already have an account? <Link href="/login">Log in</Link>
            </FieldDescription>
          }
        />
      </CardContent>
    </Card>
  )
}
