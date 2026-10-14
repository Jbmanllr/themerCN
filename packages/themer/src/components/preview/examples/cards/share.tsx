"use client";

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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { avatarDataUri } from "../avatar-data-uri";

const people = [
  {
    name: "Olivia Martin",
    email: "m@example.com",
    avatar: avatarDataUri("OM", "#2563eb"),
  },
  {
    name: "Isabella Nguyen",
    email: "b@example.com",
    avatar: avatarDataUri("IN", "#9333ea"),
  },
  {
    name: "Sofia Davis",
    email: "p@example.com",
    avatar: avatarDataUri("SD", "#db2777"),
  },
  {
    name: "Ethan Thompson",
    email: "e@example.com",
    avatar: avatarDataUri("ET", "#16a34a"),
  },
];
export function CardsShare() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Share this document</CardTitle>
        <CardDescription>
          Anyone with the link can view this document.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Label htmlFor="link" className="sr-only">
            Link
          </Label>
          <Input
            id="link"
            value="http://example.com/link/to/document"
            className="h-8"
            readOnly
          />
          <Button size="sm" variant="outline" className="shadow-none">
            Copy Link
          </Button>
        </div>
        <Separator className="my-4" />
        <div className="flex flex-col gap-4">
          <div className="text-sm font-medium">People with access</div>
          <div className="grid gap-6">
            {people.map((person) => (
              <div
                key={person.email}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={person.avatar} alt="Image" />
                    <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm leading-none font-medium">
                      {person.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {person.email}
                    </p>
                  </div>
                </div>
                <Select defaultValue="edit">
                  <SelectTrigger className="ml-auto pr-2" aria-label="Edit">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="edit">Can edit</SelectItem>
                    <SelectItem value="view">Can view</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
