// Mail layout of the Mail preview tab: a resizable account nav, message list
// and message view over the sample mails in ../data.tsx, not Host data.
//
// Contract: the demo runs inside the host's own page, so it must not touch it:
// no cookie writes (the ported example saved its panel layout in cookies) and
// no form submission (the search form prevents its submit, proved by
// mail.test.tsx).

import * as React from "react";
import {
  AlertCircle,
  Archive,
  ArchiveX,
  File,
  Inbox,
  MessagesSquare,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  Users2,
} from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Input } from "@workspace/ui/components/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { AccountSwitcher } from "./account-switcher";
import { MailDisplay } from "./mail-display";
import { MailList } from "./mail-list";
import { Nav } from "./nav";
import { type Mail } from "../data";
import { useMail } from "../use-mail";

interface MailProps {
  accounts: {
    label: string;
    email: string;
    icon: React.ReactNode;
  }[];
  mails: Mail[];
  defaultLayout?: number[];
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
}

export function Mail({
  accounts,
  mails,
  defaultLayout = [20, 32, 48],
  defaultCollapsed = false,
  navCollapsedSize,
}: MailProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [mail] = useMail();

  return (
    <TooltipProvider delay={0}>
      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full max-h-[min(800px,90vh)] items-stretch"
      >
        <ResizablePanel
          defaultSize={`${defaultLayout[0]}%`}
          collapsedSize={`${navCollapsedSize}%`}
          collapsible={true}
          minSize="15%"
          maxSize="20%"
          onResize={(panelSize) => {
            const collapsed = panelSize.asPercentage <= navCollapsedSize;
            setIsCollapsed(collapsed);
          }}
          className={cn(
            isCollapsed &&
              "min-w-[50px] transition-all duration-300 ease-in-out",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center px-2 py-1.5",
              isCollapsed && "px-0",
            )}
          >
            <AccountSwitcher isCollapsed={isCollapsed} accounts={accounts} />
          </div>
          <Separator />
          <Nav
            isCollapsed={isCollapsed}
            links={[
              {
                title: "Inbox",
                label: "128",
                icon: Inbox,
                variant: "default",
              },
              {
                title: "Drafts",
                label: "9",
                icon: File,
                variant: "ghost",
              },
              {
                title: "Sent",
                label: "",
                icon: Send,
                variant: "ghost",
              },
              {
                title: "Junk",
                label: "23",
                icon: ArchiveX,
                variant: "ghost",
              },
              {
                title: "Trash",
                label: "",
                icon: Trash2,
                variant: "ghost",
              },
              {
                title: "Archive",
                label: "",
                icon: Archive,
                variant: "ghost",
              },
            ]}
          />
          <Separator />
          <Nav
            isCollapsed={isCollapsed}
            links={[
              {
                title: "Social",
                label: "972",
                icon: Users2,
                variant: "ghost",
              },
              {
                title: "Updates",
                label: "342",
                icon: AlertCircle,
                variant: "ghost",
              },
              {
                title: "Forums",
                label: "128",
                icon: MessagesSquare,
                variant: "ghost",
              },
              {
                title: "Shopping",
                label: "8",
                icon: ShoppingCart,
                variant: "ghost",
              },
              {
                title: "Promotions",
                label: "21",
                icon: Archive,
                variant: "ghost",
              },
            ]}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={`${defaultLayout[1]}%`} minSize="30%">
          <Tabs defaultValue="all" className="flex h-full flex-col">
            <div className="flex items-center px-4 py-1.5">
              <h1 className="text-foreground text-xl font-bold">Inbox</h1>
              <TabsList className="ml-auto">
                <TabsTrigger value="all">All mail</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
              </TabsList>
            </div>
            <Separator />
            <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 p-4 backdrop-blur">
              <form onSubmit={(event) => event.preventDefault()}>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                  <Input placeholder="Search" className="pl-8" />
                </div>
              </form>
            </div>
            <TabsContent value="all" className="m-0 min-h-0 flex-1">
              <MailList items={mails} />
            </TabsContent>
            <TabsContent value="unread" className="m-0 min-h-0 flex-1">
              <MailList items={mails.filter((item) => !item.read)} />
            </TabsContent>
          </Tabs>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={`${defaultLayout[2]}%`} minSize="30%">
          <MailDisplay
            mail={mails.find((item) => item.id === mail.selected) || null}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
