import { diffLabel, offsetMinutes } from "./timezones"

export const MY_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

export const timeIn = (tz: string, date = new Date()) =>
  new Intl.DateTimeFormat(undefined, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)

const dayKey = (tz: string, date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)

/** "" when it is the same calendar day for both of us, otherwise " (next day)" / " (previous day)", or " +1d" / " −1d". */
export function dayShift(tz: string, date: Date, short = false) {
  const theirs = dayKey(tz, date)
  const mine = dayKey(MY_TZ, date)
  if (theirs === mine) return ""
  if (short) return theirs > mine ? " +1d" : " −1d"
  return theirs > mine ? " (next day)" : " (previous day)"
}

export const sameAsMine = (tz: string, date = new Date()) =>
  offsetMinutes(tz, date) === -date.getTimezoneOffset()

export const firstName = (name: string) => name.split(/\s+/)[0] || name

export const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?"

/** "15:42 · +6h" (the city sits on the picker button next to it) */
export const zoneSummary = (tz: string, date = new Date()) =>
  `${timeIn(tz, date)} · ${diffLabel(tz, date)}`
