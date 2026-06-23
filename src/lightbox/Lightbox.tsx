import { useEffect, useMemo, useRef, useState } from 'react'
import OpenSeadragon from 'openseadragon'
import { useStore } from '../state/store'
import { useMediaUrl } from '../state/useMediaUrl'
import { relationsOf } from '../lib/derive'
import { RELATION_KIND_SHORT } from '../components/ui'
import {
  dirOf,
  formatDateTime,
  shortHash,
  type Image,
} from '../core'

/**
 * Close looking. A deep-zoom viewer over one image, with point annotations.
 * Held images are zoomed as a single-level "simple image" so nothing is
 * fetched from a tile server; when an image carries a static IIIF endpoint that
 * is used instead. Annotations are stored normalized to the image, so they
 * stay glued to the picture under any zoom or pan and travel into exports.
 */
export function Lightbox() {
  const lightboxImageId = useStore((s) => s.lightboxImageId)
  const project = useStore((s) => s.project)
  const image = project.images.find((i) => i.id === lightboxImageId) ?? null

  // Close on Escape.
  useEffect(() => {
    if (!image) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useStore.getState().closeLightbox()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [image])

  if (!image) return null
  return <LightboxBody image={image} />
}

interface Pin {
  id: string
  text: string
  left: number
  top: number
}

function LightboxBody({ image }: { image: Image }) {
  const project = useStore((s) => s.project)
  const annotating = useStore((s) => s.annotating)
  const url = useMediaUrl(image.file?.blobKey)

  const hostRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<OpenSeadragon.Viewer | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [failed, setFailed] = useState(false)
  // An annotation awaiting its label: normalized image coords plus the click
  // position (viewer pixels) where the inline field is shown.
  const [pending, setPending] = useState<{ nx: number; ny: number; left: number; top: number } | null>(null)
  const [draft, setDraft] = useState('')

  const annotations = image.annotations ?? []
  const annosRef = useRef(annotations)
  annosRef.current = annotations

  // Choose a serverless source: a static IIIF endpoint if present, else the
  // held bytes as a single-image pyramid. Video links and fileless records have
  // nothing to deep-zoom.
  const source = useMemo(() => {
    if (image.iiif?.imageUrl) return { kind: 'iiif' as const, url: image.iiif.imageUrl }
    if (url && image.file) return { kind: 'image' as const, url }
    return null
  }, [image.iiif?.imageUrl, url, image.file])

  const recomputePins = () => {
    const v = viewerRef.current
    if (!v) return
    const item = v.world.getItemAt(0)
    if (!item) return
    const size = item.getContentSize()
    const next: Pin[] = annosRef.current.map((a) => {
      const vp = item.imageToViewportCoordinates(a.x * size.x, a.y * size.y)
      const px = v.viewport.viewportToViewerElementCoordinates(vp)
      return { id: a.id, text: a.text, left: px.x, top: px.y }
    })
    setPins(next)
  }

  // Build (and tear down) the viewer when the source changes.
  useEffect(() => {
    setFailed(false)
    setPins([])
    if (!hostRef.current || !source) return

    const viewer = OpenSeadragon({
      element: hostRef.current,
      showNavigationControl: false,
      showNavigator: false,
      visibilityRatio: 1,
      minZoomImageRatio: 0.8,
      maxZoomPixelRatio: 6,
      animationTime: 0.6,
      gestureSettingsMouse: { clickToZoom: false },
      tileSources:
        source.kind === 'image' ? { type: 'image', url: source.url } : source.url,
    })
    viewerRef.current = viewer

    viewer.addHandler('open', recomputePins)
    viewer.addHandler('open-failed', () => setFailed(true))
    viewer.addHandler('animation', recomputePins)
    viewer.addHandler('update-viewport', recomputePins)
    viewer.addHandler('resize', recomputePins)

    viewer.addHandler('canvas-click', (e) => {
      if (!useStore.getState().annotating) return
      const ev = e as OpenSeadragon.CanvasClickEvent
      ev.preventDefaultAction = true
      const item = viewer.world.getItemAt(0)
      if (!item) return
      const vp = viewer.viewport.pointFromPixel(ev.position)
      const ip = item.viewportToImageCoordinates(vp)
      const size = item.getContentSize()
      const nx = ip.x / size.x
      const ny = ip.y / size.y
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return
      // Open an inline label field at the click. window.prompt is suppressed in
      // installed PWAs (it returns null silently), which would make annotation
      // appear to do nothing; an in-app input always works and is dismissable.
      const px = viewer.viewport.viewportToViewerElementCoordinates(vp)
      setPending({ nx, ny, left: px.x, top: px.y })
      setDraft('')
    })

    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.kind, source?.url])

  // Recompute pins whenever the annotation set changes.
  useEffect(() => {
    recomputePins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations.length])

  // Discard an in-progress label when the image changes (the stale coords would
  // otherwise attach to the wrong picture).
  useEffect(() => {
    setPending(null)
    setDraft('')
  }, [image.id])

  const images = project.images
  const idx = images.findIndex((i) => i.id === image.id)
  const step = (d: number) => {
    const next = images[(idx + d + images.length) % images.length]
    if (next) useStore.getState().openLightbox(next.id)
  }

  const rels = relationsOf(project, image.id)
  const titleOf = (id: string) => project.images.find((i) => i.id === id)?.title ?? id

  return (
    <div className="lightbox-overlay">
      <div className="lightbox-stage">
        <button
          className="btn btn-sm lightbox-close"
          onClick={() => useStore.getState().closeLightbox()}
        >
          ✕ Close
        </button>

        {images.length > 1 && (
          <>
            <button
              className="btn btn-sm btn-ghost"
              style={{ position: 'absolute', left: 12, top: '50%', zIndex: 4 }}
              onClick={() => step(-1)}
              title="Previous image"
            >
              ‹
            </button>
            <button
              className="btn btn-sm btn-ghost"
              style={{ position: 'absolute', right: 12, top: '50%', zIndex: 4 }}
              onClick={() => step(1)}
              title="Next image"
            >
              ›
            </button>
          </>
        )}

        {source && !failed ? (
          <>
            <div className="osd-host" ref={hostRef} data-annotating={annotating} />
            {pins.map((p) => (
              <div
                key={p.id}
                className="lightbox-anno"
                style={{ left: p.left, top: p.top }}
              >
                <div className="pin" />
                <div className="pin-text">{p.text}</div>
              </div>
            ))}
            {pending && (
              <div
                className="lightbox-anno-pending"
                style={{ left: pending.left, top: pending.top }}
              >
                <div className="pin" />
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const text = draft.trim()
                    if (text) useStore.getState().addAnnotation(image.id, pending.nx, pending.ny, text)
                    setPending(null)
                    setDraft('')
                  }}
                >
                  <input
                    autoFocus
                    className="input"
                    placeholder="Label this detail"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      // Keep Escape from bubbling to the window handler that
                      // closes the lightbox; here it just cancels the label.
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        setPending(null)
                        setDraft('')
                      }
                    }}
                  />
                  <div className="btn-row">
                    <button type="submit" className="btn btn-sm btn-primary">Add</button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        setPending(null)
                        setDraft('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="lightbox-fallback">
            {url ? (
              <img src={url} alt={image.title} />
            ) : (
              <div className="empty">
                No held image to view closely.
                {image.link?.url && (
                  <div className="mono faint" style={{ marginTop: 8, fontSize: 11, wordBreak: 'break-all' }}>
                    {image.link.url}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lightbox-side">
        <div className="label">Close looking</div>
        <h2 className="plate-caption-title" dir={dirOf(image.title)} style={{ marginTop: 6 }}>
          {image.title}
        </h2>

        <div className="btn-row" style={{ margin: '12px 0' }}>
          <button
            className={`btn btn-sm ${annotating ? 'btn-primary' : ''}`}
            onClick={() => useStore.getState().setAnnotating(!annotating)}
            disabled={!source || failed}
            title={source ? 'Click the image to drop a labelled mark' : 'No held image to annotate'}
          >
            {annotating ? 'Click image to mark...' : 'Annotate'}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => useStore.getState().setEditingImage(image.id)}>
            Edit record
          </button>
        </div>

        <dl className="kv">
          <dt>Kind</dt>
          <dd>{image.kind}</dd>
          {image.datetime && (
            <>
              <dt>Time</dt>
              <dd className="mono">{formatDateTime(image.datetime.value, image.datetime.precision)}</dd>
            </>
          )}
          {image.file && (
            <>
              <dt>sha-256</dt>
              <dd className="hash" title={image.file.sha256}>{shortHash(image.file.sha256)}…</dd>
              {image.file.w && (
                <>
                  <dt>Pixels</dt>
                  <dd className="mono">{image.file.w} x {image.file.h}</dd>
                </>
              )}
            </>
          )}
          {image.iiif?.imageUrl && (
            <>
              <dt>IIIF</dt>
              <dd className="hash">{image.iiif.imageUrl}</dd>
            </>
          )}
          {image.rights && (
            <>
              <dt>Rights</dt>
              <dd>{image.rights}</dd>
            </>
          )}
        </dl>

        {image.note && <p className="prose" style={{ fontSize: 13, marginTop: 12 }}>{image.note}</p>}

        <div className="divider" />
        <div className="between">
          <span className="label">Annotations</span>
          <span className="faint mono" style={{ fontSize: 11 }}>{annotations.length}</span>
        </div>
        {annotations.length === 0 ? (
          <p className="faint" style={{ fontSize: 11, marginTop: 6 }}>
            None yet. Use Annotate, then click a detail to mark it.
          </p>
        ) : (
          <div className="stack" style={{ gap: 4, marginTop: 8 }}>
            {annotations.map((a) => (
              <div key={a.id} className="rel-row">
                <span className="rel-target">{a.text}</span>
                <button
                  className="btn btn-sm btn-ghost btn-danger"
                  onClick={() => useStore.getState().removeAnnotation(image.id, a.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="divider" />
        <span className="label">Relations</span>
        {rels.length === 0 ? (
          <p className="faint" style={{ fontSize: 11, marginTop: 6 }}>
            Not related to any other image yet.
          </p>
        ) : (
          <div className="stack" style={{ gap: 4, marginTop: 8 }}>
            {rels.map((r) => {
              const otherId = r.from === image.id ? r.to : r.from
              return (
                <button key={r.id} className="rel-row" onClick={() => useStore.getState().openLightbox(otherId)}>
                  <span className="rel-kind">{RELATION_KIND_SHORT[r.kind]}</span>
                  <span className="rel-arrow">→</span>
                  <span className="rel-target" dir={dirOf(titleOf(otherId))}>{titleOf(otherId)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
