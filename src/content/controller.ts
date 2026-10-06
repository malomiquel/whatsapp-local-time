// Keeps WhatsApp's chat header and message times annotated, and exposes the open chat to the React panel.

import { dayShift, firstName, sameAsMine, timeIn } from "@/shared/format"
import {
  loadGroups,
  saveGroups,
  watchSettings,
  type Groups,
  type Settings,
} from "@/shared/storage"
import { cityOf, diffLabel } from "@/shared/timezones"

import {
  chatPeople,
  chatTitle,
  currentChat,
  headerEl,
  MSG_CLASS,
  personOf,
  readMessages,
  subtitleMembers,
  timeLeaf,
  zoneOf,
  type Chat,
  type Message,
  type Person,
  type Zone,
} from "./whatsapp"
import { GLOBE_CLOCK_VIEWBOX, globeClockMarkup } from "@/shared/globe-clock"
import { t } from "@/shared/i18n"

const BADGE_ID = "wlt-badge"
const HEADER_MAX_PEOPLE = 2

export type PanelPerson = Person & { zone: Zone | null }
export type Snapshot = {
  open: boolean
  anchor: HTMLElement | null
  chat: Chat | null
  people: PanelPerson[]
  /** Still waiting for saved data or for WhatsApp to list the group's members. */
  loading: boolean
}

// WhatsApp fills a group's member list in the header a moment after the chat opens.
const MEMBERS_WAIT_MS = 1500

let settings: Settings = { people: {}, perMessage: true }
let groups: Groups = {}
let settingsLoaded = false
let groupsLoaded = false
let chatOpenedAt = Date.now()
let snapshot: Snapshot = {
  open: false,
  anchor: null,
  chat: null,
  people: [],
  loading: true,
}
const listeners = new Set<() => void>()

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

// ---------------------------------------------------------------------------
// Per-message annotation
// ---------------------------------------------------------------------------

/** Writes "(text)" right after the time in `container`, styled with the time's own classes; null removes it. */
function setLabel(
  container: Element | null,
  text: string | null,
  title?: string
) {
  if (!container) return
  let label = container.querySelector<HTMLElement>(`.${MSG_CLASS}`)
  const time = timeLeaf(container)
  if (!time || text === null) {
    label?.remove()
    return
  }
  if (!label) {
    label = document.createElement("span")
    time.after(label)
  }
  const className = `${time.className} ${MSG_CLASS}`.trim()
  if (label.className !== className) label.className = className
  const value = ` (${text})`
  if (label.textContent !== value) label.textContent = value
  if (title && label.title !== title) label.title = title
}

// The label goes inside WhatsApp's own time block ("msg-meta"), right after the time. WhatsApp keeps room for
// that block with an invisible copy of it at the end of the text, so the same label is added to that copy too:
// the text then wraps around the wider block exactly as it does for WhatsApp's own "Edited" marker.
function annotateMessages(chat: Chat, messages: Message[]) {
  for (const msg of messages) {
    const person = settings.perMessage ? personOf(msg, chat) : null
    const zone = person ? zoneOf(person, settings.people) : null
    if (!person || !zone || sameAsMine(zone.tz, msg.date)) {
      setLabel(msg.meta, null)
      setLabel(msg.spacer, null)
      continue
    }
    const text = `${zone.approx ? "≈ " : ""}${timeIn(zone.tz, msg.date)}${dayShift(zone.tz, msg.date, true)}`
    const title = t(
      "messageTimeTitle",
      `${timeIn(zone.tz, msg.date)}${dayShift(zone.tz, msg.date)}`,
      person.name,
      zone.tz.replace(/_/g, " "),
      diffLabel(zone.tz, msg.date)
    )
    setLabel(msg.meta, text, title)
    setLabel(msg.spacer, text)
  }
}

// ---------------------------------------------------------------------------
// Header badge
// ---------------------------------------------------------------------------

function globeClockIcon(size: number) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", GLOBE_CLOCK_VIEWBOX)
  svg.setAttribute("width", String(size))
  svg.setAttribute("height", String(size))
  svg.setAttribute("fill", "currentColor")
  svg.setAttribute("aria-hidden", "true")
  // Static markup from our own constants, no page data.
  svg.innerHTML = globeClockMarkup("wlt-globe-clock-mask")
  return svg
}

function ensureBadge(header: Element) {
  let badge = document.getElementById(BADGE_ID)
  if (badge && header.contains(badge)) return badge
  badge?.remove()
  badge = document.createElement("button")
  badge.id = BADGE_ID
  badge.setAttribute("type", "button")
  badge.append(globeClockIcon(24), document.createElement("span"))
  badge.addEventListener("click", (e) => {
    e.stopPropagation()
    publish({ open: !snapshot.open })
  })
  // Sit first in the row of header icons (search, menu…); fall back to right after the chat name.
  const info = header.querySelector('[data-testid="conversation-info-header"]')
  const icons = info?.parentElement?.nextElementSibling?.firstElementChild
  if (icons) icons.prepend(badge)
  else if (info) info.after(badge)
  else header.appendChild(badge)
  return badge
}

function updateBadge(header: Element, chat: Chat, people: PanelPerson[]) {
  const badge = ensureBadge(header)
  const now = new Date()
  const shown = people.filter(
    (p): p is PanelPerson & { zone: Zone } =>
      !!p.zone && !sameAsMine(p.zone.tz, now)
  )
  let text = ""
  let title = t("badgeTitle")
  const [first] = shown
  if (first && !chat.isGroup) {
    const { zone } = first
    text = `${zone.approx ? "≈ " : ""}${timeIn(zone.tz, now)} · ${cityOf(zone.tz)} (${diffLabel(zone.tz, now)})`
    title = zone.approx ? t("badgeTitleGuessed") : zone.tz
  } else if (shown.length) {
    const parts = shown
      .slice(0, HEADER_MAX_PEOPLE)
      .map((p) => `${firstName(p.name)} ${timeIn(p.zone.tz, now)}`)
    if (shown.length > HEADER_MAX_PEOPLE)
      parts.push(`+${shown.length - HEADER_MAX_PEOPLE}`)
    text = parts.join(" · ")
    title = shown
      .map((p) => `${p.name}: ${timeIn(p.zone.tz, now)} (${p.zone.tz})`)
      .join("\n")
  }
  const span = badge.lastElementChild!
  if (span.textContent !== text) span.textContent = text
  if (badge.title !== title) {
    badge.title = title
    badge.setAttribute("aria-label", title)
  }
  badge.classList.toggle("wlt-badge--idle", !shown.length)
  return badge
}

// ---------------------------------------------------------------------------
// Group memory
// ---------------------------------------------------------------------------

/** Remembers a group's member list and authors, so they show up even when nobody is in view. */
function rememberGroup(chat: Chat, messages: Message[]) {
  if (!chat.isGroup || !chat.title) return
  const prev = groups[chat.title] ?? { members: [], authors: [] }
  const members = subtitleMembers() ?? prev.members
  const authors = [
    ...new Set([
      ...prev.authors,
      ...messages.flatMap((m) => (m.name ? [m.name] : [])),
    ]),
  ]
  if (
    members.join("\n") === prev.members.join("\n") &&
    authors.length === prev.authors.length
  )
    return
  groups = { ...groups, [chat.title]: { members, authors } }
  saveGroups(groups)
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

let scanTimer: ReturnType<typeof setTimeout> | null = null

function scan() {
  scanTimer = null
  const header = headerEl()
  if (!header) {
    if (snapshot.chat)
      publish({ open: false, chat: null, people: [], anchor: null })
    return
  }
  const chat = currentChat(groups)
  const messages = readMessages()
  rememberGroup(chat, messages)
  annotateMessages(chat, messages)
  const people = chatPeople(chat, settings.people, groups, messages).map(
    (person) => ({ ...person, zone: zoneOf(person, settings.people) })
  )
  const anchor = updateBadge(header, chat, people)
  publish({ chat, people, anchor, loading: isLoading(chat) })
}

/**
 * Whether the member list may still grow: storage not read yet, or a chat we know nothing about whose header
 * hasn't listed members yet (it may turn out to be a group). Rescans once the wait is over.
 */
function isLoading(chat: Chat) {
  if (!settingsLoaded || !groupsLoaded) return true
  if (groups[chat.title]?.members.length) return false
  const waited = Date.now() - chatOpenedAt
  if (waited >= MEMBERS_WAIT_MS) return false
  setTimeout(scheduleScan, MEMBERS_WAIT_MS - waited)
  return true
}

function scheduleScan() {
  scanTimer ??= setTimeout(scan, 250)
}

export const controller = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => snapshot,
  setOpen(open: boolean) {
    publish({ open })
  },
  start() {
    watchSettings((next) => {
      settings = next
      settingsLoaded = true
      scheduleScan()
    })
    loadGroups().then((loaded) => {
      groups = loaded
      groupsLoaded = true
      scheduleScan()
    })
    let lastTitle: string | null = null
    new MutationObserver(() => {
      const title = chatTitle()
      if (title !== lastTitle) {
        lastTitle = title
        chatOpenedAt = Date.now()
        if (snapshot.open) publish({ open: false })
      }
      scheduleScan()
    }).observe(document.body, { childList: true, subtree: true })
    // Clocks move even when the page doesn't.
    setInterval(scheduleScan, 30 * 1000)
  },
}
