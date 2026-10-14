"use client"

import {
  LayoutDashboardIcon,
  MessageCircleIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { LogoMark } from "@/components/brand/logo"
import { chatThreads } from "@/lib/mock"
import { BRAND, appNav } from "@/lib/site"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Separator } from "@workspace/ui/components/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

const icons: Record<string, LucideIcon> = {
  "/app": LayoutDashboardIcon,
  "/app/chat": MessageCircleIcon,
  "/app/settings": SettingsIcon,
}

const titles: [prefix: string, title: string][] = [
  ["/app/chat", "Brew Assistant"],
  ["/app/settings", "Settings"],
  ["/app", "Dashboard"],
]

function isActive(pathname: string, href: string) {
  return href === "/app"
    ? pathname === "/app"
    : pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The `/app` layout: a sidebar (sections, chat threads, account) and a
 * topbar with the page title. Pages render inside the inset.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const title = titles.find(([prefix]) => pathname.startsWith(prefix))?.[1]

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/" />}>
                <LogoMark className="text-sidebar-primary" />
                <span className="font-heading text-lg">{BRAND.shortName}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {appNav.map((link) => {
                  const Icon = icons[link.href] ?? LayoutDashboardIcon
                  return (
                    <SidebarMenuItem key={link.href}>
                      <SidebarMenuButton
                        isActive={isActive(pathname, link.href)}
                        tooltip={link.label}
                        render={<Link href={link.href} />}
                      >
                        <Icon />
                        <span>{link.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {chatThreads.map((thread) => {
                  const href = `/app/chat/${thread.id}`
                  return (
                    <SidebarMenuItem key={thread.id}>
                      <SidebarMenuButton
                        size="sm"
                        isActive={pathname === href}
                        render={<Link href={href} />}
                      >
                        <span>{thread.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link href="/app/settings" />}
              >
                <Avatar className="size-8">
                  <AvatarFallback>AB</AvatarFallback>
                </Avatar>
                <span className="flex flex-col text-left leading-tight">
                  <span className="text-sm font-medium">Ada Brennan</span>
                  <span className="text-xs text-muted-foreground">
                    Night Shift plan
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-medium">{title}</h1>
        </header>
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
