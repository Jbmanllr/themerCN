"use client"

// Chat card of the Cards preview tab, with a "New message" dialog for picking
// users. Static sample people and messages; avatars are inline SVG data URIs
// because the host serves no image files.
//
// Contract: the check mark on a picked user comes from the stock CommandItem,
// which shows it when the item has `data-checked="true"`; do not draw a second
// one here.

import * as React from "react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@workspace/ui/components/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowUpIcon, PlusIcon } from "lucide-react"
import { avatarDataUri } from "../avatar-data-uri"

const users = [
  {
    name: "Olivia Martin",
    email: "m@example.com",
    avatar: avatarDataUri("OM", "#2563eb"),
  },
  {
    name: "Isabella Nguyen",
    email: "isabella.nguyen@email.com",
    avatar: avatarDataUri("IN", "#9333ea"),
  },
  {
    name: "Emma Wilson",
    email: "emma@example.com",
    avatar: avatarDataUri("EW", "#db2777"),
  },
  {
    name: "Jackson Lee",
    email: "lee@example.com",
    avatar: avatarDataUri("JL", "#16a34a"),
  },
  {
    name: "William Kim",
    email: "will@email.com",
    avatar: avatarDataUri("WK", "#ea580c"),
  },
] as const

type User = (typeof users)[number]

export function CardsChat() {
  const [open, setOpen] = React.useState(false)
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([])

  const [messages, setMessages] = React.useState([
    {
      role: "agent",
      content: "Hi, how can I help you today?",
    },
    {
      role: "user",
      content: "Hey, I'm having trouble with my account.",
    },
    {
      role: "agent",
      content: "What seems to be the problem?",
    },
    {
      role: "user",
      content: "I can't log in.",
    },
  ])
  const [input, setInput] = React.useState("")
  const inputLength = input.trim().length

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center">
          <div className="flex items-center gap-4">
            <Avatar className="border">
              <AvatarImage src={avatarDataUri("SD", "#2563eb")} alt="Image" />
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm leading-none font-medium">Sofia Davis</p>
              <p className="text-xs text-muted-foreground">m@example.com</p>
            </div>
          </div>
          <TooltipProvider delay={0}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size="icon"
                    variant="secondary"
                    className="ml-auto size-8 rounded-full"
                    onClick={() => setOpen(true)}
                  >
                    <PlusIcon />
                    <span className="sr-only">New message</span>
                  </Button>
                }
              />
              <TooltipContent sideOffset={10}>New message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {messages.map((message, index) => (
              <div
                // react-doctor-disable-next-line react-doctor/no-array-index-as-key -- messages are only ever appended, never reordered or removed, so each index keeps naming the same message
                key={index}
                className={cn(
                  "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.content}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (inputLength === 0) return
              setMessages([
                ...messages,
                {
                  role: "user",
                  content: input,
                },
              ])
              setInput("")
            }}
            className="relative w-full"
          >
            <Input
              id="message"
              placeholder="Type your message..."
              className="flex-1 pr-10"
              autoComplete="off"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2 rounded-full"
              disabled={inputLength === 0}
            >
              <ArrowUpIcon className="size-3.5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85%] flex-col gap-0">
          <DialogHeader className="p-4 pt-0 sm:pt-5">
            <DialogTitle>New message</DialogTitle>
            <DialogDescription>
              Invite a user to this thread. This will create a new group
              message.
            </DialogDescription>
          </DialogHeader>

          <Command className="overflow-hidden rounded-t-none border-t bg-transparent">
            <CommandInput placeholder="Search user..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => {
                  const isSelected = selectedUsers.includes(user)
                  return (
                    <CommandItem
                      key={user.email}
                      data-checked={isSelected}
                      className="gap-2 data-[checked=true]:opacity-50"
                      onSelect={() => {
                        if (selectedUsers.includes(user)) {
                          return setSelectedUsers(
                            selectedUsers.filter(
                              (selectedUser) => selectedUser !== user
                            )
                          )
                        }
                        return setSelectedUsers(
                          [...users].filter((u) =>
                            // react-doctor-disable-next-line react-doctor/js-set-map-lookups -- runs once per pick over the five constant demo users; a Set would not pay for itself
                            [...selectedUsers, user].includes(u)
                          )
                        )
                      }}
                    >
                      <Avatar className="size-7.5 border">
                        <AvatarImage src={user.avatar} alt="Image" />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="ml-2">
                        <p className="text-sm leading-none font-medium">
                          {user.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>

          <DialogFooter className="items-center border-t p-4 sm:justify-between">
            {selectedUsers.length > 0 ? (
              <div className="flex -space-x-2 overflow-hidden">
                {selectedUsers.map((user) => (
                  <Avatar
                    key={user.email}
                    className="inline-block size-7.5 border"
                  >
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select users to add to this thread.
              </p>
            )}
            <Button
              onClick={() => {
                setOpen(false)
              }}
              disabled={selectedUsers.length < 2}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
