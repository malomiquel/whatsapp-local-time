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

const BADGE_ID = "wlt-badge"
const HEADER_MAX_PEOPLE = 2

// Material Symbols "schedule", the icon family WhatsApp Web uses in its header.
const CLOCK_PATH =
  "m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"

export type PanelPerson = Person & { zone: Zone | null }
export type Snapshot = {
  open: boolean
  anchor: HTMLElement | null
  chat: Chat | null
  people: PanelPerson[]
}

let settings: Settings = { people: {}, perMessage: true }
let groups: Groups = {}
let snapshot: Snapshot = { open: false, anchor: null, chat: null, people: [] }
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
    const title =
      `${timeIn(zone.tz, msg.date)}${dayShift(zone.tz, msg.date)} for ${person.name} · ` +
      `${zone.tz.replace(/_/g, " ")} (${diffLabel(zone.tz, msg.date)})`
    setLabel(msg.meta, text, title)
    setLabel(msg.spacer, text)
  }
}

// ---------------------------------------------------------------------------
// Header badge
// ---------------------------------------------------------------------------

function clockIcon(size: number) {
  const NS = "http://www.w3.org/2000/svg"
  const svg = document.createElementNS(NS, "svg")
  svg.setAttribute("viewBox", "0 -960 960 960")
  svg.setAttribute("width", String(size))
  svg.setAttribute("height", String(size))
  svg.setAttribute("fill", "currentColor")
  svg.setAttribute("aria-hidden", "true")
  const path = document.createElementNS(NS, "path")
  path.setAttribute("d", CLOCK_PATH)
  svg.appendChild(path)
  return svg
}

function ensureBadge(header: Element) {
  let badge = document.getElementById(BADGE_ID)
  if (badge && header.contains(badge)) return badge
  badge?.remove()
  badge = document.createElement("button")
  badge.id = BADGE_ID
  badge.setAttribute("type", "button")
  badge.append(clockIcon(24), document.createElement("span"))
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
  let title = "Local time: set time zones"
  const [first] = shown
  if (first && !chat.isGroup) {
    const { zone } = first
    text = `${zone.approx ? "≈ " : ""}${timeIn(zone.tz, now)} · ${cityOf(zone.tz)} (${diffLabel(zone.tz, now)})`
    title = zone.approx
      ? "Time zone guessed from the phone number: click to set it"
      : zone.tz
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
  publish({ chat, people, anchor })
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
      scheduleScan()
    })
    loadGroups().then((loaded) => {
      groups = loaded
      scheduleScan()
    })
    let lastTitle: string | null = null
    new MutationObserver(() => {
      const title = chatTitle()
      if (title !== lastTitle) {
        lastTitle = title
        if (snapshot.open) publish({ open: false })
      }
      scheduleScan()
    }).observe(document.body, { childList: true, subtree: true })
    // Clocks move even when the page doesn't.
    setInterval(scheduleScan, 30 * 1000)
  },
}
