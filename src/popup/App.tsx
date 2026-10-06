import { ClockIcon, XIcon } from "lucide-react"

import { ZonePicker } from "@/components/zone-picker"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { initials, sameAsMine, zoneSummary } from "@/shared/format"
import {
  forgetPerson,
  setPerMessage,
  setPersonZone,
  useSettings,
} from "@/shared/storage"

export function App() {
  const settings = useSettings()
  if (!settings) return null
  const saved = Object.entries(settings.people).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name)
  )

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-medium">WhatsApp Local Time</h1>
        <p className="text-sm text-muted-foreground">
          Click the clock in a chat header to set where people live.
        </p>
      </div>

      <FieldGroup>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="per-message">Time on messages</FieldLabel>
            <FieldDescription>
              Show their time next to each message, e.g. 17:48 (23:48).
            </FieldDescription>
          </FieldContent>
          <Switch
            id="per-message"
            checked={settings.perMessage}
            onCheckedChange={setPerMessage}
          />
        </Field>
      </FieldGroup>

      <Separator />

      {saved.length ? (
        <div className="flex flex-col gap-2">
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            Saved time zones
          </h2>
          <ItemGroup className="gap-1">
            {saved.map(([key, { name, tz }]) => (
              <Item key={key} size="sm" variant="muted">
                <ItemMedia>
                  <Avatar>
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                </ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="w-full">
                    <span className="truncate">{name}</span>
                  </ItemTitle>
                  <ItemDescription className="tabular-nums">
                    {sameAsMine(tz) ? "Same time as you" : zoneSummary(tz)}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <ZonePicker
                    value={tz}
                    manual
                    onChange={(next) => setPersonZone(name, next)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Forget ${name}`}
                    onClick={() => forgetPerson(key)}
                  >
                    <XIcon />
                  </Button>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClockIcon />
            </EmptyMedia>
            <EmptyTitle>No time zones yet</EmptyTitle>
            <EmptyDescription>
              Open a chat on web.whatsapp.com and click the clock next to the
              search icon.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
