import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@fontsource-variable/inter"
import "@/index.css"
import { App } from "./App"

const dark = matchMedia("(prefers-color-scheme: dark)")
const applyTheme = () =>
  document.documentElement.classList.toggle("dark", dark.matches)
applyTheme()
dark.addEventListener("change", applyTheme)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
