import { SettingsForm } from "@/components/app/settings-form"

export const metadata = { title: "Settings" }

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-3xl">Your account</h2>
        <p className="text-muted-foreground">
          Your details, your subscription and what we email you about.
        </p>
      </div>
      <SettingsForm />
    </div>
  )
}
