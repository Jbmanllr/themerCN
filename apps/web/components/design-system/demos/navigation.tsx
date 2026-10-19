"use client"

import {
  BookOpenIcon,
  CoffeeIcon,
  HomeIcon,
  MessageCircleIcon,
  SettingsIcon,
} from "lucide-react"

import { State } from "@/components/design-system/specimen"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@workspace/ui/components/menubar"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@workspace/ui/components/navigation-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@workspace/ui/components/pagination"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@workspace/ui/components/sidebar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

export function NavigationMenuDemo() {
  return (
    <State label="Hover or open a section" className="min-h-48 items-start">
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Coffee</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-64 gap-1 p-1">
                {[
                  ["Single origin", "One farm, one season."],
                  ["Blends", "Balanced for milk."],
                  ["Decaf", "Swiss Water processed."],
                ].map(([title, text]) => (
                  <li key={title}>
                    <NavigationMenuLink href="#">
                      <span className="font-medium">{title}</span>
                      <span className="text-muted-foreground">{text}</span>
                    </NavigationMenuLink>
                  </li>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              href="#"
              className={navigationMenuTriggerStyle()}
            >
              Brew guides
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </State>
  )
}

export function MenubarDemo() {
  return (
    <State label="Closed; open a menu">
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Order</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              New order <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>Repeat last order</MenubarItem>
            <MenubarSeparator />
            <MenubarItem disabled>Track parcel</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem defaultChecked>
              Show prices
            </MenubarCheckboxItem>
            <MenubarCheckboxItem>Show sold out</MenubarCheckboxItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </State>
  )
}

export function BreadcrumbDemo() {
  return (
    <>
      <State label="A trail to the current page">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Shop</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Single origin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ethiopia Guji</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </State>
      <State label="Collapsed">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Blog</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Dialling in a V60</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </State>
    </>
  )
}

export function PaginationDemo() {
  return (
    <State label="Page 2 of 9">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">1</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#" isActive>
              2
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">3</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </State>
  )
}

export function TabsDemo() {
  return (
    <>
      <State label="Default" className="grid">
        <Tabs defaultValue="notes">
          <TabsList>
            <TabsTrigger value="notes">Tasting notes</TabsTrigger>
            <TabsTrigger value="farm">The farm</TabsTrigger>
            <TabsTrigger value="brew" disabled>
              Brew guide
            </TabsTrigger>
          </TabsList>
          <TabsContent value="notes" className="text-sm text-muted-foreground">
            Blueberry, jasmine, milk chocolate.
          </TabsContent>
          <TabsContent value="farm" className="text-sm text-muted-foreground">
            Smallholders around Shakiso, at 2,100 m.
          </TabsContent>
        </Tabs>
      </State>
      <State label="Line" className="grid">
        <Tabs defaultValue="week">
          <TabsList variant="line">
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="month">This month</TabsTrigger>
          </TabsList>
          <TabsContent value="week" className="text-sm text-muted-foreground">
            4 orders shipped.
          </TabsContent>
          <TabsContent value="month" className="text-sm text-muted-foreground">
            19 orders shipped.
          </TabsContent>
        </Tabs>
      </State>
    </>
  )
}

const sidebarLinks = [
  { label: "Dashboard", Icon: HomeIcon, active: true },
  { label: "Brew Assistant", Icon: MessageCircleIcon, badge: "2" },
  { label: "Orders", Icon: CoffeeIcon },
  { label: "Guides", Icon: BookOpenIcon },
  { label: "Settings", Icon: SettingsIcon },
]

export function SidebarDemo() {
  return (
    <State label="Expanded, one item active" className="grid">
      <SidebarProvider className="min-h-0" keyboardShortcut={false}>
        <Sidebar collapsible="none" className="h-72 w-full rounded-2xl border">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Nightjar</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarLinks.map(({ label, Icon, active, badge }) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton isActive={active}>
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                      {badge && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </State>
  )
}
