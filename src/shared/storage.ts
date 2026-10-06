import * as React from "react"

/** A time zone chosen by hand, keyed by "name:<display name>". */
export type SavedPerson = { tz: string; name: string }
export type People = Record<string, SavedPerson>

/** What we learnt about a group: names from the header subtitle, and authors seen in its messages. */
export type GroupInfo = { members: string[]; authors: string[] }
export type Groups = Record<string, GroupInfo>

export type Settings = { people: People; perMessage: boolean }

const SYNC_DEFAULTS: Settings = { people: {}, perMessage: true }

export const personKey = (name: string) => `name:${name}`

export async function loadSettings(): Promise<Settings> {
  return (await chrome.storage.sync.get(SYNC_DEFAULTS)) as Settings
}

export async function loadGroups(): Promise<Groups> {
  return (
    (await chrome.storage.local.get({ groups: {} })) as { groups: Groups }
  ).groups
}

export function saveGroups(groups: Groups) {
  return chrome.storage.local.set({ groups })
}

export async function setPersonZone(name: string, tz: string | null) {
  const { people } = await loadSettings()
  const next = { ...people }
  if (tz) next[personKey(name)] = { tz, name }
  else delete next[personKey(name)]
  await chrome.storage.sync.set({ people: next })
}

export async function forgetPerson(key: string) {
  const { people } = await loadSettings()
  const next = { ...people }
  delete next[key]
  await chrome.storage.sync.set({ people: next })
}

export function setPerMessage(perMessage: boolean) {
  return chrome.storage.sync.set({ perMessage })
}

/** Calls `listener` with fresh settings now and whenever they change. Returns an unsubscribe function. */
export function watchSettings(listener: (settings: Settings) => void) {
  let current: Settings = SYNC_DEFAULTS
  loadSettings().then((settings) => {
    current = settings
    listener(current)
  })
  const onChanged = (
    changes: Record<string, chrome.storage.StorageChange>,
    area: string
  ) => {
    if (area !== "sync") return
    current = {
      people: (changes.people
        ? (changes.people.newValue ?? {})
        : current.people) as People,
      perMessage: changes.perMessage
        ? changes.perMessage.newValue !== false
        : current.perMessage,
    }
    listener(current)
  }
  chrome.storage.onChanged.addListener(onChanged)
  return () => chrome.storage.onChanged.removeListener(onChanged)
}

export function useSettings() {
  const [settings, setSettings] = React.useState<Settings | null>(null)
  React.useEffect(() => watchSettings(setSettings), [])
  return settings
}
