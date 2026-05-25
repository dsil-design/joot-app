"use client"

import * as React from "react"

/**
 * Patches two iOS-only touchmove bugs caused by react-remove-scroll, which
 * Radix Dialog wraps its content with. That library attaches a capture-phase
 * `touchmove` listener on the document and preventDefaults movements outside
 * the allowed container's bounds, which breaks:
 *
 *   1. Native selection-handle drags inside Dialog inputs/textareas — iOS
 *      dispatches touchmove during the drag, gets preventDefaulted, and the
 *      handles render but won't move.
 *   2. Touch scrolling inside Radix popovers/selects/dropdowns rendered while
 *      a Dialog is open — they portal to `document.body`, so they sit outside
 *      the allowed container and their internal scroll gets blocked.
 *
 * Fix: register capture-phase `touchmove` listeners at app start, before any
 * Dialog mounts (and therefore before react-remove-scroll's listener). When
 * the event matches one of the patched cases, stopImmediatePropagation so
 * react-remove-scroll's listener never fires.
 *
 * Selection-handle variant validated on iPad via `/diag/handles` Variant G.
 */
export function IOSSelectionFix() {
  React.useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const target = e.target as Element | null
      if (target?.closest("[data-radix-popper-content-wrapper]")) {
        e.stopImmediatePropagation()
        return
      }

      const active = document.activeElement
      if (
        !(active instanceof HTMLInputElement) &&
        !(active instanceof HTMLTextAreaElement)
      ) {
        return
      }
      const start = active.selectionStart
      const end = active.selectionEnd
      if (start === null || end === null || start === end) return
      e.stopImmediatePropagation()
    }
    document.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: true,
    })
    return () => {
      document.removeEventListener(
        "touchmove",
        onTouchMove,
        { capture: true } as EventListenerOptions
      )
    }
  }, [])

  return null
}
