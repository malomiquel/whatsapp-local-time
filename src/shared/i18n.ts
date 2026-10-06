// Translations live in public/_locales/<lang>/messages.json; Chrome picks the browser's language, English otherwise.

import type messages from "../../public/_locales/en/messages.json"

export type MessageKey = keyof typeof messages

/** The translated message, with $PLACEHOLDERS$ filled in order from `substitutions`. */
export function t(key: MessageKey, ...substitutions: string[]) {
  return chrome.i18n.getMessage(key, substitutions) || key
}
