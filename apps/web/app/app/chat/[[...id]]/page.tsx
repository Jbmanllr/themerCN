import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ChatView } from "@/components/app/chat-view"
import { chatThreads, getChatThread } from "@/lib/mock"

export const dynamicParams = false

export function generateStaticParams() {
  return [{ id: [] }, ...chatThreads.map((thread) => ({ id: [thread.id] }))]
}

function threadFor(id: string[] | undefined) {
  if (!id || id.length === 0) return { thread: undefined }
  const thread = id.length === 1 ? getChatThread(id[0]!) : undefined
  return thread ? { thread } : notFound()
}

export async function generateMetadata({
  params,
}: PageProps<"/app/chat/[[...id]]">): Promise<Metadata> {
  const { thread } = threadFor((await params).id)
  return { title: thread ? thread.title : "Brew Assistant" }
}

export default async function Page({
  params,
}: PageProps<"/app/chat/[[...id]]">) {
  const { thread } = threadFor((await params).id)
  // Keyed so switching threads starts from that thread's saved messages.
  return <ChatView key={thread?.id ?? "new"} thread={thread} />
}
