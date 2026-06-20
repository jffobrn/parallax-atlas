import * as Dialog from '@radix-ui/react-dialog'
import { APP_NAME, DISCLAIMER, SUITE_NAME, TAGLINE } from '../core'

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content ticks">
          <Dialog.Title className="dialog-title">
            {APP_NAME} <span className="faint">// {SUITE_NAME}</span>
          </Dialog.Title>
          <Dialog.Description className="dialog-desc">{TAGLINE}</Dialog.Description>

          <div className="prose" style={{ fontSize: 13 }}>
            <p style={{ marginBottom: 12 }}>
              Gather many images of one place, object, or event and make the
              dispersed corpus a navigable whole. Arrange images into a Mnemosyne
              plate where meaning comes from juxtaposition; relate them into an
              image complex you can read as a graph; place camera vantages on a
              map so several views of one object cross and locate it; and look
              closely with deep zoom and annotation. Warburg&apos;s plate meeting
              Forensic Architecture&apos;s operative model.
            </p>

            <span className="label">Three views, one corpus</span>
            <p style={{ margin: '6px 0 12px' }}>
              Plate, Graph, and Map are three readings of the same images, linked
              to a shared timeline. Select an image in any one and it lights up in
              the others. Vantages of one object resect it, exactly as in
              Sightlines, the suite&apos;s first tool, whose core Atlas reuses.
            </p>

            <span className="label">Consent by design</span>
            <p style={{ margin: '6px 0 12px' }}>
              One boundary function produces every export and every published
              view. It drops embargoed and restricted images, reduces providers
              to aliases, hides provenance, withholds unsafe coordinates, and (the
              point that matters twice in an atlas) removes any relation or plate
              tile that would betray a withheld image. Nothing sensitive can leak
              because it never crosses that boundary.
            </p>

            <div className="note-box">{DISCLAIMER}</div>

            <p className="faint" style={{ marginTop: 12, fontSize: 12 }}>
              Runs entirely in your browser. The project and its media stay on
              your machine in local storage; nothing is uploaded. Held images are
              deep-zoomed as single-image pyramids, so close looking needs no tile
              server, and the basemap fetches no tiles. The bundled sample is
              plainly fictional.
            </p>
          </div>

          <Dialog.Close asChild>
            <button className="dialog-close" aria-label="Close">&times;</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
