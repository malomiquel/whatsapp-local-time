import * as React from "react"

// Radix portals default to document.body, which sits outside our shadow root
// (and its styles). Components read the container from here instead.
const PortalContainerContext = React.createContext<HTMLElement | null>(null)

export const PortalContainerProvider = PortalContainerContext.Provider

export function usePortalContainer() {
  return React.useContext(PortalContainerContext) ?? undefined
}
