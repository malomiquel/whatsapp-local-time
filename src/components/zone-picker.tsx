import * as React from "react"
import { cn } from "cn"
import { CheckIcon, ChevronsUpDownIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { timeIn } from "@/shared/format"
import { cityOf, searchZones } from "@/shared/timezones"

const POPULAR = [
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Bangkok",
  "Asia/Makassar",
  "Asia/Tokyo",
  "Australia/Sydney",
]

type ZonePickerProps = {
  /** The zone currently in effect (saved or guessed). */
  value: string | null
  /** Whether `value` was chosen by hand, which enables "Back to automatic". */
  manual: boolean
  onChange: (tz: string | null) => void
}

export function ZonePicker({ value, manual, onChange }: ZonePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const matches = query
    ? searchZones(query, 30)
    : POPULAR.map((tz) => ({ tz, label: tz.replace(/_/g, " ") }))
  // Without its own filtering, cmdk keeps highlighting an item from the previous results: Enter must pick the
  // first match for what was just typed.
  const [highlighted, setHighlighted] = React.useState("")
  const firstMatch = matches[0]?.tz ?? ""
  React.useEffect(() => setHighlighted(firstMatch), [firstMatch])

  const choose = (tz: string | null) => {
    onChange(tz)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          role="combobox"
          aria-expanded={open}
          className={cn("max-w-28", !manual && "text-muted-foreground")}
        >
          <span className="truncate">{value ? cityOf(value) : "Set"}</span>
          <ChevronsUpDownIcon data-icon="inline-end" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 rounded-2xl p-0"
        align="end"
        // Radix can't find the input to focus from inside a shadow root; point it there.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          inputRef.current?.focus()
        }}
      >
        <Command
          shouldFilter={false}
          value={highlighted}
          onValueChange={setHighlighted}
        >
          <CommandInput
            ref={inputRef}
            placeholder="City or country…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No time zone found.</CommandEmpty>
            {manual && !query && (
              <>
                <CommandGroup>
                  <CommandItem onSelect={() => choose(null)}>
                    <RotateCcwIcon />
                    Back to automatic
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading={query ? "Results" : "Popular"}>
              {matches.map(({ tz, label }) => (
                <CommandItem key={tz} value={tz} onSelect={() => choose(tz)}>
                  {tz === value && manual ? <CheckIcon /> : null}
                  <span className="truncate">{label}</span>
                  <CommandShortcut>{timeIn(tz)}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
