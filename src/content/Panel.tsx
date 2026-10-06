import * as React from "react"
import { UsersIcon } from "lucide-react"

import { ZonePicker } from "@/components/zone-picker"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { initials, sameAsMine, zoneSummary } from "@/shared/format"
import { setPersonZone } from "@/shared/storage"

import { controller, type PanelPerson } from "./controller"

export function Panel() {
  const { open, anchor, chat, people } = React.useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot
  )
  const anchorRef = React.useRef<HTMLElement | null>(null)
  anchorRef.current = anchor

  if (!chat || !anchor) return null

  return (
    <Popover open={open} onOpenChange={controller.setOpen}>
      <PopoverAnchor virtualRef={anchorRef as React.RefObject<HTMLElement>} />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 gap-3 p-3"
        // The badge toggles the panel itself; don't let its click count as "outside".
        onInteractOutside={(e) => {
          if (anchor.contains(e.target as Node)) e.preventDefault()
        }}
      >
        <PopoverHeader className="px-2 pt-1">
          <PopoverTitle className="truncate">
            {chat.isGroup ? chat.title : "Local time"}
          </PopoverTitle>
          <PopoverDescription>
            {chat.isGroup
              ? `${people.length} ${people.length === 1 ? "person" : "people"} · pick where each one lives`
              : `Pick where ${chat.title} lives`}
          </PopoverDescription>
        </PopoverHeader>
        {people.length ? (
          <ScrollArea className="max-h-96">
            <ItemGroup className="gap-1">
              {people.map((person) => (
                <PersonRow key={person.key} person={person} />
              ))}
            </ItemGroup>
          </ScrollArea>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>No members yet</EmptyTitle>
              <EmptyDescription>
                Members appear once the group header lists them.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </PopoverContent>
    </Popover>
  )
}

function PersonRow({ person }: { person: PanelPerson }) {
  const { zone } = person
  return (
    <Item size="sm">
      <ItemMedia>
        <Avatar>
          <AvatarFallback>{initials(person.name)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full">
          <span className="truncate">{person.name}</span>
          {zone && !zone.manual && <Badge variant="secondary">Guessed</Badge>}
        </ItemTitle>
        <ItemDescription className="tabular-nums">
          {!zone
            ? "Time zone not set"
            : sameAsMine(zone.tz)
              ? `Same time as you · ${zone.tz.replace(/_/g, " ")}`
              : `${zone.approx ? "≈ " : ""}${zoneSummary(zone.tz)}`}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <ZonePicker
          value={zone?.tz ?? null}
          manual={!!zone?.manual}
          onChange={(tz) => setPersonZone(person.name, tz)}
        />
      </ItemActions>
    </Item>
  )
}
