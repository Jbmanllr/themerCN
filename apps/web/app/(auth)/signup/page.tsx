import Link from "next/link"

import { SignupForm } from "@/components/auth/auth-form"
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
        <SignupForm
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
