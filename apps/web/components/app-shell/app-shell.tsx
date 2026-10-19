import Link from "next/link"
import type { ReactNode } from "react"

import { AppNavButton, AppPageTitle } from "@/components/app-shell/app-nav"
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

/**
 * The `/app` layout: a sidebar (sections, chat threads, account) and a
 * topbar with the page title. Pages render inside the inset. A Server
 * Component: only the pathname-reading leaves in `app-nav` ship as client
 * code, and only each thread's id and title reach the page.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      {/* Fixed to the viewport, so it opts in to the Themer's Push layout:
          it starts after the Themer sidebar (themercn README, "Push"). */}
      <Sidebar
        collapsible="icon"
        className="data-[side=left]:left-[var(--themer-inset-left,0px)]"
      >
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
                {appNav.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <AppNavButton href={href} tooltip={label}>
                      <Icon />
                      <span>{label}</span>
                    </AppNavButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {chatThreads.map(({ id, title }) => (
                  <SidebarMenuItem key={id}>
                    <AppNavButton href={`/app/chat/${id}`} exact size="sm">
                      <span>{title}</span>
                    </AppNavButton>
                  </SidebarMenuItem>
                ))}
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
          <AppPageTitle className="text-sm font-medium" />
        </header>
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
