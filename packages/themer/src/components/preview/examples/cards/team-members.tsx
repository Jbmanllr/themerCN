"use client";

import { ChevronDown } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { avatarDataUri } from "../avatar-data-uri";

const teamMembers = [
  {
    name: "Sofia Davis",
    email: "m@example.com",
    avatar: avatarDataUri("SD", "#2563eb"),
    role: "Owner",
  },
  {
    name: "Jackson Lee",
    email: "p@example.com",
    avatar: avatarDataUri("JL", "#16a34a"),
    role: "Developer",
  },
  {
    name: "Isabella Nguyen",
    email: "i@example.com",
    avatar: avatarDataUri("IN", "#9333ea"),
    role: "Billing",
  },
];

const roles = [
  {
    name: "Viewer",
    description: "Can view and comment.",
  },
  {
    name: "Developer",
    description: "Can view, comment and edit.",
  },
  {
    name: "Billing",
    description: "Can view, comment and manage billing.",
  },
  {
    name: "Owner",
    description: "Admin-level access to all resources.",
  },
];

export function CardsTeamMembers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          Invite your team members to collaborate.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {teamMembers.map((member) => (
          <div
            key={member.name}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <Avatar className="border">
                <AvatarImage src={member.avatar} alt="Image" />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm leading-none font-medium">
                  {member.name}
                </p>
                <p className="text-muted-foreground text-xs">{member.email}</p>
              </div>
            </div>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto shadow-none"
                  >
                    {member.role} <ChevronDown />
                  </Button>
                }
              />
              <PopoverContent className="p-0" align="end">
                <Command>
                  <CommandInput placeholder="Select role..." />
                  <CommandList>
                    <CommandEmpty>No roles found.</CommandEmpty>
                    <CommandGroup>
                      {roles.map((role) => (
                        <CommandItem key={role.name}>
                          <div className="flex flex-col">
                            <p className="text-sm font-medium">{role.name}</p>
                            <p className="text-muted-foreground">
                              {role.description}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
