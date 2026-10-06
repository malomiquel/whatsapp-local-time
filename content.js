// Shows the real local time of the people you talk to: a clock in the chat header and, under each
// message, the time it was for them. In groups every member gets their own time zone.
(() => {
  'use strict';

  const { guessFromPhone, searchZones, cityOf, offsetMinutes, diffLabel } = globalThis.WTZ;

  const BADGE_ID = 'wtz-badge';
  const PANEL_ID = 'wtz-panel';
  const MSG_CLASS = 'wtz-msg';
  const HEADER_MAX_PEOPLE = 2;

  // Material Symbols "schedule", the icon family WhatsApp Web uses in its header.
  const CLOCK_PATH = 'm612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z';

  let people = {}; // personKey -> { tz, name }; personKey is a WhatsApp id ("336…@c.us", "…@lid") or "name:<display name>"
  let perMessage = true;
  let scanTimer = null;

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  chrome.storage.sync.get({ people: {}, perMessage: true }, (data) => {
    people = data.people;
    perMessage = data.perMessage;
    scheduleScan();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.people) people = changes.people.newValue || {};
    if (changes.perMessage) perMessage = changes.perMessage.newValue !== false;
    scheduleScan();
    refreshPanel();
  });

  function savePerson(key, name, tz) {
    const next = { ...people };
    if (tz) next[key] = { tz, name };
    else delete next[key];
    people = next;
    chrome.storage.sync.set({ people: next });
  }

  // ---------------------------------------------------------------------------
  // Reading the open chat from the DOM
  // ---------------------------------------------------------------------------

  const headerEl = () => document.querySelector('#main header');

  function chatTitle() {
    const header = headerEl();
    const el = header?.querySelector('[data-testid="conversation-info-header-chat-title-name"]') ||
      header?.querySelector('span[dir="auto"]');
    return (el?.getAttribute('title') || el?.textContent || '').trim();
  }

  /** Digits of a displayed phone number ("+62 812-3456-7890"), else null. */
  const phoneDigits = (text) => {
    const trimmed = (text || '').trim();
    const digits = trimmed.replace(/[^\d]/g, '');
    return /^\+?[\d\s().-]{7,}$/.test(trimmed) && digits.length >= 8 ? digits : null;
  };

  /** Digits of a phone-based WhatsApp id; null for groups and privacy ids (@lid). */
  const jidPhone = (jid) => (/^(\d+)@(c\.us|s\.whatsapp\.net)$/.exec(jid || '') || [])[1] || null;

  /** Parses WhatsApp's "[21:32, 06/10/2026] " / "[9:32 PM, 10/6/2026] " prefix into a Date (browser time). */
  function parseStamp(stamp) {
    const t = /(\d{1,2})[:h.](\d{2})(?:\s*([AaPp])\.?\s?[Mm]\.?)?/.exec(stamp);
    const d = /(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})/.exec(stamp);
    if (!t || !d) return null;
    let hour = Number(t[1]);
    if (t[3]) hour = (hour % 12) + (/p/i.test(t[3]) ? 12 : 0);
    const [a, b, c] = d.slice(1).map(Number);
    let year, month, day;
    if (d[1].length === 4) [year, month, day] = [a, b, c];
    else {
      year = c < 100 ? 2000 + c : c;
      const monthFirst = a <= 12 && (b > 12 || /^en-US/i.test(navigator.language));
      [month, day] = monthFirst ? [a, b] : [b, a];
    }
    const date = new Date(year, month - 1, day, hour, Number(t[2]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  /** Older WhatsApp builds put "<fromMe>_<chat>_<msgId>[_<author>]" in data-id; newer ones only the message id. */
  function legacyId(el) {
    const id = el.closest('[data-id]')?.dataset.id || '';
    if (!id.includes('@')) return null;
    const parts = id.split('_');
    return { fromMe: parts[0] === 'true', chatJid: parts[1], participant: parts[3] || null };
  }

  /** Whether a bubble is one I sent: explicit markers first, then which side of the chat it sits on. */
  function isOutgoing(copyEl, legacy) {
    if (legacy) return legacy.fromMe;
    const row = copyEl.closest('[data-id]') || copyEl.closest('[data-testid="msg-container"]') || copyEl;
    if (row.querySelector('[data-icon="tail-out"], [data-testid="tail-out"]') || copyEl.closest('.message-out')) return true;
    if (row.querySelector('[data-icon="tail-in"], [data-testid="tail-in"], [data-testid="author"]') || copyEl.closest('.message-in')) return false;
    const bubble = (row.querySelector('[data-testid="msg-container"]') || copyEl).getBoundingClientRect();
    const pane = document.getElementById('main').getBoundingClientRect();
    return bubble.left + bubble.width / 2 > pane.left + pane.width / 2;
  }

  /** Everything we need about one message bubble. */
  function readMessage(copyEl) {
    const m = /^\[([^\]]+)\]\s*(.*?):\s*$/.exec(copyEl.dataset.prePlainText || '');
    if (!m) return null;
    const legacy = legacyId(copyEl);
    return {
      date: parseStamp(m[1]),
      name: m[2],
      fromMe: isOutgoing(copyEl, legacy),
      participant: legacy?.participant || null
    };
  }

  /** "17:48" / "5:48 PM" -> [hour, minute] in 24h, or null. */
  function parseTime(text) {
    const t = /^(\d{1,2})[:h.](\d{2})(?:\s*([AaPp])\.?\s?[Mm]\.?)?$/.exec((text || '').trim());
    if (!t) return null;
    let hour = Number(t[1]);
    if (t[3]) hour = (hour % 12) + (/p/i.test(t[3]) ? 12 : 0);
    return [hour, Number(t[2])];
  }

  /**
   * Every loaded message bubble that shows a time, in chat order, as
   * { meta, spacer, date, name, fromMe, participant }.
   * Text messages and captioned media carry "[time, date] author:" in data-pre-plain-text. Photos and videos
   * without a caption only show the time and, first in a run, the author: the author then carries over from the
   * previous bubble of the run, and the day comes from the nearest dated bubble (only the time of day matters for
   * the offset, barring a DST switch on that very day).
   */
  function readMessages() {
    const list = [];
    for (const row of document.querySelectorAll('#main [data-id]')) {
      const meta = row.querySelector('[data-testid="msg-meta"]');
      const time = parseTime(timeLeaf(meta)?.textContent);
      if (!meta || !time) continue;
      const copyEl = row.querySelector('[data-pre-plain-text]');
      const msg = copyEl && readMessage(copyEl);
      if (msg) {
        list.push({ ...msg, meta, spacer: [...copyEl.querySelectorAll('span[aria-hidden="true"]')].pop() || null });
        continue;
      }
      const legacy = legacyId(row);
      const fromMe = isOutgoing(row, legacy);
      const prev = list[list.length - 1];
      const author = row.querySelector('[data-testid="author"]')?.textContent.trim();
      const name = fromMe ? null : author || (prev && !prev.fromMe ? prev.name : null);
      list.push({ date: null, time, name, fromMe, participant: legacy?.participant || null, meta, spacer: null });
    }
    // Undated bubbles take the day of the closest dated one before them, else after them, else today.
    let lastDay = null;
    for (const msg of list) if (msg.date) lastDay = msg.date; else msg.day = lastDay;
    let nextDay = null;
    for (const msg of [...list].reverse()) {
      if (msg.date) { nextDay = msg.date; continue; }
      const day = msg.day || nextDay || new Date();
      msg.date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), msg.time[0], msg.time[1]);
    }
    return list.filter((msg) => msg.date && (msg.fromMe || msg.name));
  }

  /** The open chat. People are keyed by display name, so a time zone set in a group also applies in 1:1. */
  function currentChat() {
    const title = chatTitle();
    const chatJid = legacyId(document.querySelector('#main [data-id*="@"]') || document.body)?.chatJid || null;
    const isGroup = chatJid ? chatJid.endsWith('@g.us') : looksLikeGroup(title);
    return { title, chatJid, isGroup, key: `name:${title}` };
  }

  /** Groups show the author above incoming bubbles; failing that, someone other than the chat title writes in it. */
  function looksLikeGroup(title) {
    if (document.querySelector('#main [data-testid="author"]')) return true;
    for (const copyEl of document.querySelectorAll('#main [data-pre-plain-text]')) {
      const msg = readMessage(copyEl);
      if (msg && !msg.fromMe && msg.name !== title) return true;
    }
    return false;
  }

  const contactOf = (chat) => ({ key: chat.key, name: chat.title, phone: jidPhone(chat.chatJid) || phoneDigits(chat.title) });

  /** The person whose clock matters for this message, or null (my own message in a group). */
  function personOf(msg, chat) {
    if (!chat.isGroup) return contactOf(chat);
    if (msg.fromMe) return null;
    return { key: `name:${msg.name}`, name: msg.name, phone: jidPhone(msg.participant) || phoneDigits(msg.name) };
  }

  /** { tz, approx, manual } for a person, or null when we know nothing. */
  function zoneOf(person) {
    const saved = people[person.key] || people[`name:${person.name}`];
    if (saved?.tz) return { tz: saved.tz, approx: false, manual: true };
    const guess = guessFromPhone(person.phone);
    return guess ? { ...guess, manual: false } : null;
  }

  const sameAsMine = (tz, date = new Date()) => offsetMinutes(tz, date) === -date.getTimezoneOffset();

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  const MY_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timeIn = (tz, date) => new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(date);
  const dayKey = (tz, date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

  /** "" when it is the same calendar day for both of us, otherwise " (lendemain)" / " (veille)", or " +1 j" / " −1 j". */
  function dayShift(tz, date, short = false) {
    const theirs = dayKey(tz, date);
    const mine = dayKey(MY_TZ, date);
    if (theirs === mine) return '';
    if (short) return theirs > mine ? ' +1 j' : ' −1 j';
    return theirs > mine ? ' (lendemain)' : ' (veille)';
  }

  const firstName = (name) => (name || '').split(/\s+/)[0] || name;

  function clockIcon(size) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 -960 960 960');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', CLOCK_PATH);
    svg.appendChild(path);
    return svg;
  }

  /** An element made of the clock icon followed by a text span; returns the span. */
  function withIcon(el, size) {
    el.append(clockIcon(size), document.createElement('span'));
    return el.lastChild;
  }

  // ---------------------------------------------------------------------------
  // Per-message annotation
  // ---------------------------------------------------------------------------

  /** The innermost element holding the message time ("17:48", "5:48 PM") inside `container`. */
  function timeLeaf(container) {
    if (!container) return null;
    for (const el of container.querySelectorAll('span')) {
      if (!el.children.length && !el.classList.contains(MSG_CLASS) && /^\d{1,2}[:h.]\d{2}(\s?[AaPp]\.?\s?[Mm]\.?)?$/.test(el.textContent.trim())) return el;
    }
    return null;
  }

  /** Writes "(text)" right after the time in `container`, styled with the time's own classes; null removes it. */
  function setLabel(container, text, title) {
    let label = container?.querySelector(`.${MSG_CLASS}`);
    const time = timeLeaf(container);
    if (!time || text === null) return label?.remove();
    if (!label) {
      label = document.createElement('span');
      time.after(label);
    }
    label.className = `${time.className} ${MSG_CLASS}`.trim();
    const value = ` (${text})`;
    if (label.textContent !== value) label.textContent = value;
    if (title) label.title = title;
  }

  // The label goes inside WhatsApp's own time block ("msg-meta"), right after the time. WhatsApp keeps room for
  // that block with an invisible copy of it at the end of the text, so the same label is added to that copy too:
  // the text then wraps around the wider block exactly as it does for WhatsApp's own "Edited" marker.
  function annotateMessages(chat) {
    for (const msg of readMessages()) {
      const person = perMessage ? personOf(msg, chat) : null;
      const zone = person ? zoneOf(person) : null;
      if (!zone || sameAsMine(zone.tz, msg.date)) {
        setLabel(msg.meta, null);
        setLabel(msg.spacer, null);
        continue;
      }
      const text = `${zone.approx ? '≈ ' : ''}${timeIn(zone.tz, msg.date)}${dayShift(zone.tz, msg.date, true)}`;
      const title = `${timeIn(zone.tz, msg.date)}${dayShift(zone.tz, msg.date)} pour ${person.name} · ` +
        `${zone.tz.replace(/_/g, ' ')} (${diffLabel(zone.tz, msg.date)})`;
      setLabel(msg.meta, text, title);
      setLabel(msg.spacer, text);
    }
  }

  // ---------------------------------------------------------------------------
  // Header badge
  // ---------------------------------------------------------------------------

  /** People in the chat: the contact for a 1:1, every sender with a loaded message for a group. */
  function peopleInChat(chat) {
    if (!chat.isGroup) return [contactOf(chat)];
    const found = new Map();
    for (const msg of readMessages()) {
      const person = personOf(msg, chat);
      if (person && !found.has(person.key)) found.set(person.key, person);
    }
    return [...found.values()];
  }

  function updateBadge(chat) {
    const header = headerEl();
    let badge = document.getElementById(BADGE_ID);
    if (!badge || !header.contains(badge)) {
      badge?.remove();
      badge = document.createElement('button');
      badge.id = BADGE_ID;
      badge.type = 'button';
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanel(badge);
      });
      withIcon(badge, 24);
      // Sit first in the row of header icons (search, menu…); fall back to right after the chat name.
      const info = header.querySelector('[data-testid="conversation-info-header"]');
      const icons = info?.parentElement?.nextElementSibling?.firstElementChild;
      if (icons) icons.prepend(badge);
      else if (info) info.after(badge);
      else header.appendChild(badge);
    }

    const now = new Date();
    const shown = peopleInChat(chat)
      .map((person) => ({ person, zone: zoneOf(person) }))
      .filter(({ zone }) => zone && !sameAsMine(zone.tz, now));

    let text = '';
    let title = 'Heure locale : définir le fuseau horaire';
    if (shown.length && !chat.isGroup) {
      const { zone } = shown[0];
      text = `${zone.approx ? '≈ ' : ''}${timeIn(zone.tz, now)} · ${cityOf(zone.tz)} (${diffLabel(zone.tz, now)})`;
      title = zone.approx ? 'Fuseau deviné depuis le numéro : cliquez pour le préciser' : zone.tz;
    } else if (shown.length) {
      const parts = shown.slice(0, HEADER_MAX_PEOPLE).map(({ person, zone }) => `${firstName(person.name)} ${timeIn(zone.tz, now)}`);
      if (shown.length > HEADER_MAX_PEOPLE) parts.push(`+${shown.length - HEADER_MAX_PEOPLE}`);
      text = parts.join(' · ');
      title = shown.map(({ person, zone }) => `${person.name} : ${timeIn(zone.tz, now)} (${zone.tz})`).join('\n');
    }
    const span = badge.lastChild;
    if (span.textContent !== text) span.textContent = text;
    badge.title = title;
    badge.setAttribute('aria-label', title);
    badge.classList.toggle('wtz-badge--idle', !shown.length);
  }

  // ---------------------------------------------------------------------------
  // Time zone picker panel
  // ---------------------------------------------------------------------------

  function togglePanel(badge) {
    if (document.getElementById(PANEL_ID)) return closePanel();
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.addEventListener('click', (e) => e.stopPropagation());
    document.body.appendChild(panel);
    const rect = badge.getBoundingClientRect();
    panel.style.top = `${rect.bottom + 6}px`;
    panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 340))}px`;
    renderPanel(panel);
  }

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  function refreshPanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel && !panel.contains(document.activeElement)) renderPanel(panel);
  }

  function renderPanel(panel) {
    const chat = currentChat();
    const list = peopleInChat(chat);
    panel.replaceChildren();

    const heading = document.createElement('div');
    heading.className = 'wtz-panel__title';
    heading.textContent = chat.isGroup ? `Fuseaux horaires · ${chat.title}` : 'Fuseau horaire du contact';
    panel.appendChild(heading);

    for (const person of list) panel.appendChild(personRow(person));

    if (chat.isGroup) {
      const hint = document.createElement('p');
      hint.className = 'wtz-panel__hint';
      hint.textContent = list.length
        ? 'Seuls les membres ayant un message chargé apparaissent : remontez dans la discussion pour en voir d\'autres.'
        : 'Aucun membre détecté : remontez dans la discussion pour charger des messages.';
      panel.appendChild(hint);
    }
  }

  function personRow(person) {
    const zone = zoneOf(person);
    const now = new Date();
    const row = document.createElement('div');
    row.className = 'wtz-row';

    const name = document.createElement('span');
    name.className = 'wtz-row__name';
    name.textContent = person.name || person.key;
    const meta = document.createElement('span');
    meta.className = 'wtz-row__meta';
    meta.textContent = zone
      ? `${timeIn(zone.tz, now)} · ${zone.tz.replace(/_/g, ' ')} (${diffLabel(zone.tz, now)})${zone.manual ? '' : zone.approx ? ' · deviné ≈' : ' · deviné'}`
      : 'Fuseau inconnu';
    const info = document.createElement('div');
    info.className = 'wtz-row__info';
    info.append(name, meta);

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ville ou pays (ex. Bali, Tokyo…)';
    input.spellcheck = false;
    const suggestions = document.createElement('div');
    suggestions.className = 'wtz-suggestions';
    const field = document.createElement('div');
    field.className = 'wtz-field';
    field.append(input, suggestions);

    const choose = (tz) => {
      savePerson(person.key, person.name, tz);
      renderPanel(document.getElementById(PANEL_ID));
      scheduleScan();
    };

    let matches = [];
    input.addEventListener('input', () => {
      matches = searchZones(input.value);
      suggestions.replaceChildren(...matches.map(({ tz, label }) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.textContent = `${label} — ${timeIn(tz, new Date())}`;
        option.addEventListener('click', () => choose(tz));
        return option;
      }));
    });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // keep WhatsApp's own shortcuts out of the way
      if (e.key === 'Enter' && matches[0]) choose(matches[0].tz);
      if (e.key === 'Escape') closePanel();
    });

    row.append(info, field);

    if (people[person.key]) {
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'wtz-row__reset';
      reset.textContent = 'Revenir à l\'automatique';
      reset.addEventListener('click', () => choose(null));
      row.appendChild(reset);
    }
    return row;
  }

  document.addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closePanel());

  // ---------------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------------

  function scan() {
    scanTimer = null;
    if (!headerEl()) return closePanel();
    const chat = currentChat();
    annotateMessages(chat);
    updateBadge(chat);
  }

  function scheduleScan() {
    if (!scanTimer) scanTimer = setTimeout(scan, 250);
  }

  let lastTitle = null;
  new MutationObserver(() => {
    const title = chatTitle();
    if (title !== lastTitle) {
      lastTitle = title;
      closePanel();
    }
    scheduleScan();
  }).observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    scheduleScan();
    refreshPanel();
  }, 30 * 1000);
})();
