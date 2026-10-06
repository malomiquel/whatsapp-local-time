import { ClockIcon, XIcon } from "lucide-react"

import { ZonePicker } from "@/components/zone-picker"
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
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { sameAsMine, zoneSummary } from "@/shared/format"
import {
  forgetPerson,
  setPerMessage,
  setPersonZone,
  useSettings,
} from "@/shared/storage"
import { t } from "@/shared/i18n"

export function App() {
  const settings = useSettings()
  if (!settings) return null
  const saved = Object.entries(settings.people).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name)
  )

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-sm font-medium">{t("extName")}</h1>
        <p className="text-xs text-muted-foreground">{t("popupIntro")}</p>
      </div>

      <FieldGroup>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="per-message">
              {t("popupPerMessageLabel")}
            </FieldLabel>
            <FieldDescription>
              {t("popupPerMessageDescription")}
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
        <div className="flex flex-col gap-1">
          <h2 className="px-2 text-xs font-medium text-muted-foreground">
            {t("popupSaved")}
          </h2>
          <ItemGroup className="gap-0">
            {saved.map(([key, { name, tz }]) => (
              <Item
                key={key}
                size="xs"
                className="rounded-xl py-1 pr-1 hover:bg-muted/60"
              >
                <ItemContent className="min-w-0">
                  <ItemTitle className="w-full font-normal">
                    <span className="truncate">{name}</span>
                  </ItemTitle>
                </ItemContent>
                <ItemActions className="gap-1">
                  {!sameAsMine(tz) && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {zoneSummary(tz)}
                    </span>
                  )}
                  <ZonePicker
                    value={tz}
                    manual
                    onChange={(next) => setPersonZone(name, next)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t("popupForget", name)}
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
            <EmptyTitle>{t("popupEmptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("popupEmptyDescription")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
