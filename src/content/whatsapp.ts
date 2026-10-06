// Reading the open chat out of WhatsApp Web's DOM.

import { guessFromPhone, type Guess } from "@/shared/timezones"
import { personKey, type Groups, type People } from "@/shared/storage"

export const MSG_CLASS = "wlt-msg"

export type Person = { key: string; name: string; phone: string | null }
export type Zone = Guess & { manual: boolean }
export type Chat = { title: string; isGroup: boolean; contact: Person }

export type Message = {
  date: Date
  name: string | null
  fromMe: boolean
  meta: Element
  spacer: Element | null
}

export const headerEl = () => document.querySelector("#main header")

export function chatTitle() {
  const header = headerEl()
  const el =
    header?.querySelector(
      '[data-testid="conversation-info-header-chat-title-name"]'
    ) ?? header?.querySelector('span[dir="auto"]')
  return (el?.getAttribute("title") || el?.textContent || "").trim()
}

/** Digits of a displayed phone number ("+62 812-3456-7890"), else null. */
export function phoneDigits(text: string | null | undefined) {
  const trimmed = (text ?? "").trim()
  const digits = trimmed.replace(/[^\d]/g, "")
  return /^\+?[\d\s().-]{7,}$/.test(trimmed) && digits.length >= 8
    ? digits
    : null
}

/** Older WhatsApp builds put "<fromMe>_<chat>_<msgId>[_<author>]" in data-id; newer ones only the message id. */
function legacyId(el: Element | null) {
  const id = (el?.closest("[data-id]") as HTMLElement | null)?.dataset.id ?? ""
  if (!id.includes("@")) return null
  const parts = id.split("_")
  return { fromMe: parts[0] === "true", chatJid: parts[1] ?? "" }
}

/** Whether a bubble is one I sent: explicit markers first, then which side of the chat it sits on. */
function isOutgoing(row: Element) {
  const legacy = legacyId(row)
  if (legacy) return legacy.fromMe
  if (row.querySelector('[data-icon="tail-out"], [data-testid="tail-out"]'))
    return true
  if (
    row.querySelector(
      '[data-icon="tail-in"], [data-testid="tail-in"], [data-testid="author"]'
    )
  )
    return false
  const bubble = (
    row.querySelector('[data-testid="msg-container"]') ?? row
  ).getBoundingClientRect()
  const pane = document.getElementById("main")!.getBoundingClientRect()
  return bubble.left + bubble.width / 2 > pane.left + pane.width / 2
}

/** "17:48" / "5:48 PM" -> [hour, minute] in 24h, or null. */
function parseTime(text: string | null | undefined): [number, number] | null {
  const t = /^(\d{1,2})[:h.](\d{2})(?:\s*([AaPp])\.?\s?[Mm]\.?)?$/.exec(
    (text ?? "").trim()
  )
  if (!t) return null
  let hour = Number(t[1])
  if (t[3]) hour = (hour % 12) + (/p/i.test(t[3]) ? 12 : 0)
  return [hour, Number(t[2])]
}

/** Parses WhatsApp's "[21:32, 06/10/2026] " / "[9:32 PM, 10/6/2026] " prefix into a Date (browser time). */
function parseStamp(stamp: string) {
  const d = /(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})/.exec(stamp)
  const time = parseTime(
    /\d{1,2}[:h.]\d{2}(?:\s*[AaPp]\.?\s?[Mm]\.?)?/.exec(stamp)?.[0]
  )
  if (!d || !time) return null
  const [a, b, c] = d.slice(1).map(Number) as [number, number, number]
  let year: number, month: number, day: number
  if (d[1]!.length === 4) [year, month, day] = [a, b, c]
  else {
    year = c < 100 ? 2000 + c : c
    const monthFirst = a <= 12 && (b > 12 || /^en-US/i.test(navigator.language))
    ;[month, day] = monthFirst ? [a, b] : [b, a]
  }
  const date = new Date(year, month - 1, day, time[0], time[1])
  return Number.isNaN(date.getTime()) ? null : date
}

/** The innermost element holding the message time ("17:48", "5:48 PM") inside `container`. */
export function timeLeaf(container: Element | null) {
  if (!container) return null
  for (const el of container.querySelectorAll("span")) {
    if (
      !el.children.length &&
      !el.classList.contains(MSG_CLASS) &&
      parseTime(el.textContent)
    )
      return el
  }
  return null
}

/**
 * Every loaded message bubble that shows a time, in chat order.
 * Text messages and captioned media carry "[time, date] author:" in data-pre-plain-text. Photos and videos
 * without a caption only show the time and, first in a run, the author: the author then carries over from the
 * previous bubble of the run, and the day comes from the nearest dated bubble (only the time of day matters for
 * the offset, barring a DST switch on that very day).
 */
export function readMessages(): Message[] {
  type Draft = Omit<Message, "date"> & {
    date: Date | null
    time: [number, number]
    day?: Date | null
  }
  const list: Draft[] = []
  for (const row of document.querySelectorAll("#main [data-id]")) {
    const meta = row.querySelector('[data-testid="msg-meta"]')
    const time = parseTime(timeLeaf(meta)?.textContent)
    if (!meta || !time) continue
    const fromMe = isOutgoing(row)
    const copyEl = row.querySelector<HTMLElement>("[data-pre-plain-text]")
    const pre = /^\[([^\]]+)\]\s*(.*?):\s*$/.exec(
      copyEl?.dataset.prePlainText ?? ""
    )
    if (copyEl && pre) {
      const spacer = [
        ...copyEl.querySelectorAll('span[aria-hidden="true"]'),
      ].pop()
      list.push({
        date: parseStamp(pre[1]!),
        time,
        name: fromMe ? null : pre[2]!,
        fromMe,
        meta,
        spacer: spacer ?? null,
      })
      continue
    }
    const prev = list[list.length - 1]
    const author = row
      .querySelector('[data-testid="author"]')
      ?.textContent?.trim()
    const name = fromMe
      ? null
      : author || (prev && !prev.fromMe ? prev.name : null)
    list.push({ date: null, time, name, fromMe, meta, spacer: null })
  }
  // Undated bubbles take the day of the closest dated one before them, else after them, else today.
  let lastDay: Date | null = null
  for (const msg of list) {
    if (msg.date) lastDay = msg.date
    else msg.day = lastDay
  }
  let nextDay: Date | null = null
  for (const msg of [...list].reverse()) {
    if (msg.date) {
      nextDay = msg.date
      continue
    }
    const day = msg.day ?? nextDay ?? new Date()
    msg.date = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      msg.time[0],
      msg.time[1]
    )
  }
  return list
    .filter((msg) => msg.fromMe || msg.name)
    .map(({ date, name, fromMe, meta, spacer }) => ({
      date: date!,
      name,
      fromMe,
      meta,
      spacer,
    }))
}

// How WhatsApp names you at the end of a group's member list, per language.
const SELF_NAMES = new Set([
  "you",
  "vous",
  "toi",
  "tú",
  "tu",
  "du",
  "jij",
  "voi",
  "você",
  "sie",
  "ty",
])

/** Member names from a group's header subtitle ("Alex, Sam, You"), or null when it shows something else. */
export function subtitleMembers() {
  const el = headerEl()?.querySelector('[data-testid="chat-subtitle"] span')
  const text = (el?.getAttribute("title") || el?.textContent || "").trim()
  // Statuses ("Sam is typing…", "click here for group info") are not lists.
  if (!text.includes(", ") || /typing|écrit|…|\.\.\./i.test(text)) return null
  const names = text
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name && !SELF_NAMES.has(name.toLowerCase()))
  return names.length ? names : null
}

export function currentChat(groups: Groups): Chat {
  const title = chatTitle()
  const legacyJid = legacyId(
    document.querySelector("#main [data-id*='@']")
  )?.chatJid
  const isGroup = legacyJid
    ? legacyJid.endsWith("@g.us")
    : !!document.querySelector('#main [data-testid="author"]') ||
      !!subtitleMembers() ||
      !!groups[title]
  return {
    title,
    isGroup,
    contact: { key: personKey(title), name: title, phone: phoneDigits(title) },
  }
}

/**
 * Everyone in the chat. In a group: the members listed in the header (remembered per group, since the subtitle
 * turns into "… is typing" at times) plus anyone seen writing. The header shows short names ("Alex") while
 * messages show full ones ("Alex Martin"): a short name is matched to the single full name it starts.
 */
export function chatPeople(
  chat: Chat,
  people: People,
  groups: Groups,
  messages: Message[]
): Person[] {
  if (!chat.isGroup) return [chat.contact]
  const info = groups[chat.title] ?? { members: [], authors: [] }
  const authors = new Set(info.authors)
  for (const msg of messages) if (msg.name) authors.add(msg.name)
  const fullNames = [
    ...new Set([...authors, ...Object.values(people).map((p) => p.name)]),
  ]

  const found = new Map<string, Person>()
  const add = (name: string, phoneSource = name) => {
    const key = personKey(name)
    if (!found.has(key))
      found.set(key, { key, name, phone: phoneDigits(phoneSource) })
  }
  for (const short of info.members) {
    const matches = fullNames.filter(
      (full) => full === short || full.startsWith(`${short} `)
    )
    add(matches.length === 1 ? matches[0]! : short, short)
  }
  for (const name of authors) add(name)
  return [...found.values()]
}

/** The person whose clock matters for this message, or null (my own message in a group). */
export function personOf(msg: Message, chat: Chat): Person | null {
  if (!chat.isGroup) return chat.contact
  if (msg.fromMe || !msg.name) return null
  return {
    key: personKey(msg.name),
    name: msg.name,
    phone: phoneDigits(msg.name),
  }
}

export function zoneOf(person: Person, people: People): Zone | null {
  const saved = people[person.key]
  if (saved?.tz) return { tz: saved.tz, approx: false, manual: true }
  const guess = guessFromPhone(person.phone)
  return guess ? { ...guess, manual: false } : null
}
