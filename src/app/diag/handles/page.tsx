"use client"

/**
 * iOS text-selection handle diagnostic.
 *
 * Open on iPad. For each card, tap into the input, double-tap a word, and
 * try to DRAG the blue selection handles left/right. Note which cards
 * allow the drag and which don't.
 */

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const SAMPLE = "The quick brown fox jumps over the lazy dog"

export default function HandleDiagnostic() {
  const [openA, setOpenA] = React.useState(false)
  const [openB, setOpenB] = React.useState(false)
  const [openC, setOpenC] = React.useState(false)
  const [openD, setOpenD] = React.useState(false)
  const [openE, setOpenE] = React.useState(false)
  const [openF, setOpenF] = React.useState(false)
  const [openG, setOpenG] = React.useState(false)

  // Variant G: capture-phase touchmove guard that stops propagation
  // (so react-remove-scroll never preventDefaults) when the user has an
  // active text-selection inside an input. Registered at mount so it
  // runs before any Dialog's RemoveScroll listener.
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

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">iOS Selection Handle Diagnostic</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          For each, tap the input, double-tap a word, then try to drag the
          handles. Note which work and which don&apos;t.
        </p>
      </div>

      <Card label="Baseline 1 — plain input, no dialog">
        <Input defaultValue={SAMPLE} />
      </Card>

      <Card label="A — plain Dialog, nothing custom">
        <Button onClick={() => setOpenA(true)}>Open A</Button>
        <Dialog open={openA} onOpenChange={setOpenA}>
          <DialogContent>
            <DialogHeader><DialogTitle>A</DialogTitle></DialogHeader>
            <Input defaultValue={SAMPLE} />
          </DialogContent>
        </Dialog>
      </Card>

      <Card label="B — Dialog with overflow-y-auto + max-h (create-from-import shape)">
        <Button onClick={() => setOpenB(true)}>Open B</Button>
        <Dialog open={openB} onOpenChange={setOpenB}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto [&>*]:min-w-0">
            <DialogHeader><DialogTitle>B</DialogTitle></DialogHeader>
            <Input defaultValue={SAMPLE} />
          </DialogContent>
        </Dialog>
      </Card>

      <Card label="C — Dialog with flex flex-col + inner overflow-y-auto (review-focus-modal shape)">
        <Button onClick={() => setOpenC(true)}>Open C</Button>
        <Dialog open={openC} onOpenChange={setOpenC}>
          <DialogContent className="max-h-[90dvh] p-0 gap-0 flex flex-col">
            <DialogHeader className="px-5 pt-5">
              <DialogTitle>C</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-5">
              <Input defaultValue={SAMPLE} />
            </div>
          </DialogContent>
        </Dialog>
      </Card>

      <Card label="D — Dialog like B but with extra height so it scrolls">
        <Button onClick={() => setOpenD(true)}>Open D</Button>
        <Dialog open={openD} onOpenChange={setOpenD}>
          <DialogContent className="max-w-md max-h-[60vh] overflow-y-auto">
            <DialogHeader><DialogTitle>D</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input defaultValue={SAMPLE} />
              {Array.from({ length: 20 }).map((_, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  Filler line {i + 1} to force vertical scroll inside the dialog.
                </p>
              ))}
              <Input defaultValue={SAMPLE} />
            </div>
          </DialogContent>
        </Dialog>
      </Card>

      <Card label="E — Dialog with modal={false} (bypasses react-remove-scroll)">
        <Button onClick={() => setOpenE(true)}>Open E</Button>
        <Dialog open={openE} onOpenChange={setOpenE} modal={false}>
          <DialogContent>
            <DialogHeader><DialogTitle>E</DialogTitle></DialogHeader>
            <Input defaultValue={SAMPLE} />
          </DialogContent>
        </Dialog>
      </Card>

      <Card label="F — Dialog with onInteractOutside swallowed (neutralizes DismissableLayer)">
        <Button onClick={() => setOpenF(true)}>Open F</Button>
        <Dialog open={openF} onOpenChange={setOpenF}>
          <DialogContent
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader><DialogTitle>F</DialogTitle></DialogHeader>
            <Input defaultValue={SAMPLE} />
          </DialogContent>
        </Dialog>
      </Card>

      <Card label="G — modal=true with capture-phase touchmove guard (real-fix candidate)">
        <Button onClick={() => setOpenG(true)}>Open G</Button>
        <Dialog open={openG} onOpenChange={setOpenG}>
          <DialogContent>
            <DialogHeader><DialogTitle>G</DialogTitle></DialogHeader>
            <Input defaultValue={SAMPLE} />
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  )
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  )
}
