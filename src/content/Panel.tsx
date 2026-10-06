import * as React from "react"

import { cn } from "cn"

import { ZonePicker } from "@/components/zone-picker"
import { Skeleton } from "@/components/ui/skeleton"
import { Item, ItemActions, ItemContent, ItemTitle } from "@/components/ui/item"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
} from "@/components/ui/popover"
import { sameAsMine, zoneSummary } from "@/shared/format"
import { setPersonZone } from "@/shared/storage"

import { controller, type PanelPerson } from "./controller"
import { t } from "@/shared/i18n"

export function Panel() {
  const { open, anchor, chat, people, loading } = React.useSyncExternalStore(
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
        sideOffset={6}
        className="w-72 gap-0 rounded-2xl p-1.5"
        // The badge toggles the panel itself; don't let its click count as "outside".
        onInteractOutside={(e) => {
          if (anchor.contains(e.target as Node)) e.preventDefault()
        }}
      >
        <PopoverHeader className="px-2 pt-1 pb-1.5">
          <PopoverTitle className="truncate text-xs font-medium text-muted-foreground">
            {chat.isGroup ? chat.title : t("panelTitleContact")}
          </PopoverTitle>
        </PopoverHeader>
        {loading ? (
          <LoadingRows />
        ) : people.length ? (
          <div className="flex max-h-80 flex-col overflow-y-auto overscroll-contain">
            {people.map((person) => (
              <PersonRow key={person.key} person={person} />
            ))}
          </div>
        ) : (
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            {t("panelNoMembers")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

const SKELETON_WIDTHS = ["w-24", "w-32", "w-20", "w-28"]

/** Placeholder rows shaped like PersonRow while the member list is still coming in. */
function LoadingRows() {
  return (
    <div
      className="flex flex-col"
      aria-busy="true"
      aria-label={t("loadingMembers")}
    >
      {SKELETON_WIDTHS.map((width) => (
        <div key={width} className="flex h-8 items-center justify-between px-3">
          <Skeleton className={cn("h-3.5", width)} />
          <Skeleton className="h-3.5 w-12" />
        </div>
      ))}
    </div>
  )
}

function PersonRow({ person }: { person: PanelPerson }) {
  const { zone } = person
  const away = zone && !sameAsMine(zone.tz)
  return (
    <Item size="xs" className="rounded-xl py-1 pr-1 hover:bg-muted/60">
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full font-normal">
          <span className="truncate">{person.name}</span>
        </ItemTitle>
      </ItemContent>
      <ItemActions className="gap-1">
        {away && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {zone.approx ? "≈ " : ""}
            {zoneSummary(zone.tz)}
          </span>
        )}
        <ZonePicker
          value={zone?.tz ?? null}
          manual={!!zone?.manual}
          onChange={(tz) => setPersonZone(person.name, tz)}
        />
      </ItemActions>
    </Item>
  )
}
