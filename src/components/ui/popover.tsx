import * as React from "react"
import { cn } from "cn"
import { Popover as PopoverPrimitive } from "radix-ui"

import { usePortalContainer } from "@/lib/portal"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

type OutsideEvent = CustomEvent<{ originalEvent: Event }>

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ref,
  onFocusOutside,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const container = usePortalContainer()
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const setRef = (node: HTMLDivElement | null) => {
    contentRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }
  // Inside a shadow root, the document sees every event retargeted to the host, so Radix takes clicks and
  // focus inside the popover for outside ones. The composed path still tells the truth.
  const isInside = (e: OutsideEvent) =>
    !!contentRef.current &&
    e.detail.originalEvent.composedPath().includes(contentRef.current)
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        ref={setRef}
        onFocusOutside={(e) => {
          if (isInside(e)) e.preventDefault()
          else onFocusOutside?.(e)
        }}
        onPointerDownOutside={(e) => {
          if (isInside(e)) e.preventDefault()
          else onPointerDownOutside?.(e)
        }}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-4 rounded-3xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/5 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <div
      data-slot="popover-title"
      className={cn("text-base font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
