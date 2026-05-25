"use client"

import * as React from "react"

/**
 * Keeps native iOS text-selection handles draggable inside Radix Dialogs.
 *
 * Why: Radix Dialog's `<DialogContent>` wraps its tree in react-remove-scroll,
 * which attaches a capture-phase `touchmove` listener on the document and
 * preventDefaults movements that would scroll past the allowed container's
 * bounds. iOS dispatches touchmove during a selection-handle drag, and that
 * preventDefault aborts the drag — handles render but won't move.
 *
 * Fix: register a capture-phase `touchmove` listener at app start, before any
 * Dialog mounts (and therefore before react-remove-scroll's listener). When
 * an input/textarea has a non-collapsed selection (i.e. the user is likely
 * dragging a handle), stopImmediatePropagation so react-remove-scroll's
 * listener never fires.
 *
 * Validated on iPad via `/diag/handles` Variant G.
 */
export function IOSSelectionFix() {
  React.useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
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
