# WhatsApp Local Time

Chrome extension for **WhatsApp Web** that shows the real local time of contacts living in another time zone,
including each member of a group.

## What it shows

- **In the chat header**: a clock styled like WhatsApp's own icons, with the person's current time, e.g.
  `🕒 Alex 15:22`, or for a contact `🕒 15:22 · Makassar (+6h)`.
- **On every message**, in brackets after WhatsApp's time and in the same font: what time it was for the person when
  the message was sent, e.g. `17:48 (23:48)` or `23:30 (05:30 +1d)`.
  Works on text messages, photos and videos. Hover for details (time zone, offset).
- People in your own time zone are left untouched.

## Install

1. Download **`whatsapp-local-time.zip`** from the [latest release](../../releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the unzipped folder.
4. Open or reload [web.whatsapp.com](https://web.whatsapp.com).

Works in Chrome, Edge, Brave, Arc and other Chromium browsers.

## Setting someone's time zone

Example: Alex lives in Bali and writes in your "Family" group.

1. Open the chat and click the 🕒 clock in the header.
2. Under "Alex", type `Bali` and pick **Bali (Asia/Makassar)**.

The setting is saved per name and synced with your Chrome account: it applies in every group and in your private chat
with that person. In a group, the list shows members with a message loaded on screen; scroll up to see more.

Without a manual setting, the time zone is guessed from the phone number's country code when it is visible (`≈` when
the country spans several zones). A French number used abroad is still seen as "Paris": set the time zone by hand.

The extension popup lists saved time zones and lets you hide the time on messages.

## Privacy

Everything runs in your browser. The extension reads the WhatsApp Web page to find times and names, and only stores the
time zones you choose (`chrome.storage.sync`). No data is sent anywhere.

## Limitations

- The extension relies on the structure of the WhatsApp Web page, which may change with WhatsApp updates.
- Voice notes and stickers are not annotated.

## License

MIT
