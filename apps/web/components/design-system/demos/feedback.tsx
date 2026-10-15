"use client"

import { CircleAlertIcon, InfoIcon } from "lucide-react"
import { useState } from "react"

import { State } from "@/components/design-system/specimen"
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Toast,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  useToastManager,
} from "@workspace/ui/components/toast"
import { usePortalContainer } from "@workspace/ui/lib/portal-container"

export function AlertDemo() {
  return (
    <>
      <State label="Default, with an action" className="grid">
        <Alert>
          <InfoIcon />
          <AlertTitle>Roasting on Monday</AlertTitle>
          <AlertDescription>
            Orders placed by Sunday night ship on Tuesday.
          </AlertDescription>
          <AlertAction>
            <Button size="xs" variant="outline">
              Got it
            </Button>
          </AlertAction>
        </Alert>
      </State>
      <State label="Destructive" className="grid">
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>
            Your card was declined. Update it in Settings to keep your
            subscription.
          </AlertDescription>
        </Alert>
      </State>
    </>
  )
}

function ToastButtons() {
  const manager = useToastManager()
  return (
    <>
      <Button
        variant="outline"
        onClick={() =>
          manager.add({
            title: "Added to bag",
            description: "Ethiopia Guji, 250 g",
            type: "success",
          })
        }
      >
        Show a toast
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          manager.add({
            title: "Could not save",
            description: "Check your connection and try again.",
            type: "error",
          })
        }
      >
        Show an error
      </Button>
    </>
  )
}

function ToastList() {
  const { toasts } = useToastManager()
  return toasts.map((item) => (
    <Toast key={item.id} toast={item}>
      <ToastContent>
        <div className="grid flex-1 gap-0.5">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastClose />
      </ToastContent>
    </Toast>
  ))
}

/**
 * Each half keeps its own toast manager and portals its toasts into the
 * half, so a toast takes that half's mode.
 */
export function ToastDemo() {
  const [manager] = useState(createToastManager)
  const container = usePortalContainer()
  return (
    <ToastProvider toastManager={manager}>
      <State label="Trigger a toast">
        <ToastButtons />
      </State>
      <ToastPortal container={container}>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}

export function ProgressDemo() {
  return (
    <>
      <State label="With a label and value" className="grid">
        <Progress value={64}>
          <ProgressLabel>Roasting</ProgressLabel>
          <ProgressValue />
        </Progress>
      </State>
      <State label="Empty and full" className="grid">
        <Progress value={0} aria-label="Not started" />
        <Progress value={100} aria-label="Done" />
      </State>
    </>
  )
}

export function SkeletonDemo() {
  return (
    <State label="A product card loading">
      <Skeleton className="size-14 rounded-2xl" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </State>
  )
}

export function SpinnerDemo() {
  return (
    <>
      <State label="Sizes and colours">
        <Spinner className="size-3" />
        <Spinner />
        <Spinner className="size-6" />
        <Spinner className="size-6 text-primary" />
      </State>
      <State label="In a button">
        <Button disabled>
          <Spinner data-icon="inline-start" />
          Placing order
        </Button>
      </State>
    </>
  )
}
