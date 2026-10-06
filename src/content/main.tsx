import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import css from "@/index.css?inline"
import { PortalContainerProvider } from "@/lib/portal"
import { controller } from "./controller"
import pageCss from "./page.css?inline"
import { Panel } from "./Panel"

const HOST_ID = "whatsapp-local-time-ext"

function injectDocumentStyles() {
  // Fonts and @property rules are ignored inside shadow roots, so they go in the document,
  // next to the styles for the badge and labels that live in WhatsApp's own DOM.
  const fontUrl = (file: string) => chrome.runtime.getURL(`fonts/${file}`)
  const properties = css.match(/@property[^{]+\{[^}]*\}/g)?.join("\n") ?? ""
  const style = document.createElement("style")
  style.dataset.whatsappLocalTime = ""
  style.textContent = `
    @font-face {
      font-family: "Inter Variable";
      font-style: normal;
      font-display: swap;
      font-weight: 100 900;
      src: url("${fontUrl("inter-latin-ext.woff2")}") format("woff2-variations");
      unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
    }
    @font-face {
      font-family: "Inter Variable";
      font-style: normal;
      font-display: swap;
      font-weight: 100 900;
      src: url("${fontUrl("inter-latin.woff2")}") format("woff2-variations");
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
    ${properties}
    ${pageCss}
  `
  document.head.appendChild(style)
}

function mount() {
  if (document.getElementById(HOST_ID)) return
  injectDocumentStyles()

  const host = document.createElement("div")
  host.id = HOST_ID
  const shadow = host.attachShadow({ mode: "open" })

  const style = document.createElement("style")
  style.textContent = css
  shadow.appendChild(style)

  // Own stacking context above the page; fixed children still use the viewport.
  const root = document.createElement("div")
  root.className = "wlt-root"
  root.style.cssText = "position:relative;z-index:2147483647"
  shadow.appendChild(root)

  // Follow WhatsApp's own theme (it puts "dark" on <body>), else the system's.
  const dark = matchMedia("(prefers-color-scheme: dark)")
  const applyTheme = () =>
    root.classList.toggle(
      "dark",
      document.body.classList.contains("dark") || dark.matches
    )
  applyTheme()
  dark.addEventListener("change", applyTheme)
  new MutationObserver(applyTheme).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  })

  // WhatsApp sends keystrokes typed anywhere to its message box; keep ours in the panel.
  for (const type of ["keydown", "keyup", "keypress", "input", "paste"]) {
    host.addEventListener(type, (e) => e.stopPropagation())
  }

  // Must live in <body>: Radix's aria-hidden only hides siblings of nodes inside body.
  document.body.appendChild(host)

  createRoot(root).render(
    <StrictMode>
      <PortalContainerProvider value={root}>
        <Panel />
      </PortalContainerProvider>
    </StrictMode>
  )
  controller.start()
}

if (window === window.top) mount()
