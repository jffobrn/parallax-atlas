import { useRef, useState } from 'react'
import {
  formatBearing,
  formatBytes,
  formatDateTime,
  type Certainty,
  type Image,
  type TimePrecision,
} from '../core'
import { useStore } from '../state/store'
import { useMediaUrl } from '../state/useMediaUrl'
import { ingestFile } from '../lib/ingest'
import { findWaybackSnapshot } from '../lib/wayback'
import { BearingDial } from '../components/BearingDial'
import { PointFields } from '../components/points'
import {
  CERTAINTY_OPTIONS,
  CONSENT_OPTIONS,
  Dir,
  EnumSeg,
  Field,
  IMAGE_KIND_OPTIONS,
  PRECISION_OPTIONS,
  SelectMenu,
} from '../components/ui'

const CONSENT_NOTE: Record<Image['consent'], string> = {
  public: 'Included in exports and the published atlas.',
  restricted: 'Kept in your project file, withheld from anything published.',
  embargoed: 'Kept in your project file, withheld from anything published.',
}

export function ImageEditor({ image }: { image: Image }) {
  const activePanelId = useStore((s) => s.activePanelId)
  const project = useStore((s) => s.project)
  const setPlacing = useStore((s) => s.setPlacing)
  const placing = useStore((s) => s.placing)

  const fileInput = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [wb, setWb] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const previewUrl = useMediaUrl(image.file?.blobKey)

  const id = image.id
  const patch = (partial: Partial<Image>) => useStore.getState().updateImage(id, partial)

  const activePanel = project.panels.find((p) => p.id === activePanelId)
  const onActivePlate = !!activePanel?.items.some((it) => it.imageId === id)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy('Hashing file...')
    try {
      const held = await ingestFile(file)
      patch({ file: held })
    } finally {
      setBusy(null)
    }
  }

  const requestSnapshot = async () => {
    if (!image.link?.url) return
    setWb('Asking the Internet Archive...')
    try {
      const snap = await findWaybackSnapshot(image.link.url)
      if (!snap) {
        setWb('No snapshot found for that URL.')
        return
      }
      patch({ link: { ...image.link, ...snap } })
      setWb('Snapshot found and hashed.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setWb(
        /fetch|network|load failed/i.test(msg)
          ? 'Could not reach the Internet Archive (offline, blocked, or CORS). The link is saved; try again when online.'
          : msg || 'Lookup failed.',
      )
    }
  }

  return (
    <div className="panel-body" style={{ paddingTop: 12 }}>
      {/* quick actions */}
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <button className="btn btn-sm" onClick={() => useStore.getState().openLightbox(id)}>
          Look closely
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            // setView clears any in-progress link, so switch first, then start.
            useStore.getState().setView('graph')
            useStore.getState().startLink(id)
          }}
        >
          Relate
        </button>
      </div>

      {/* identity */}
      <Field label="Title">
        <input
          className="input"
          value={image.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </Field>
      <Field label="Kind">
        <SelectMenu
          value={image.kind}
          options={IMAGE_KIND_OPTIONS}
          onChange={(v) => patch({ kind: v })}
          ariaLabel="image kind"
        />
      </Field>

      <div className="divider" />
      <span className="label">Time</span>
      <div style={{ height: 6 }} />
      <Field label="Datetime (ISO, UTC)" hint="Leave blank if unknown.">
        <input
          className="input input-mono"
          placeholder="1979-06-02T00:00:00Z"
          value={image.datetime?.value ?? ''}
          onChange={(e) => {
            const value = e.target.value.trim()
            if (!value) patch({ datetime: undefined })
            else patch({ datetime: { value, precision: image.datetime?.precision ?? 'day' } })
          }}
        />
      </Field>
      {image.datetime && (
        <>
          <Field label="Precision">
            <EnumSeg<TimePrecision>
              value={image.datetime.precision}
              options={PRECISION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => patch({ datetime: { value: image.datetime!.value, precision: v } })}
            />
          </Field>
          <p className="faint" style={{ fontSize: 11, marginTop: -4 }}>
            {formatDateTime(image.datetime.value, image.datetime.precision)}
          </p>
        </>
      )}

      <div className="divider" />
      <span className="label">Provenance &amp; rights</span>
      <div style={{ height: 6 }} />
      <Field label="Provider" hint="Reduced to an alias in anything published.">
        <input
          className="input"
          value={image.provider ?? ''}
          onChange={(e) => patch({ provider: e.target.value || undefined })}
        />
      </Field>
      <Field label="Provenance" hint="Origin and how obtained. Never published.">
        <textarea
          className="textarea"
          value={image.provenance ?? ''}
          onChange={(e) => patch({ provenance: e.target.value || undefined })}
        />
      </Field>
      <Field label="Rights">
        <input
          className="input"
          value={image.rights ?? ''}
          onChange={(e) => patch({ rights: e.target.value || undefined })}
        />
      </Field>

      <div className="divider" />
      <span className="label">Consent</span>
      <div style={{ height: 6 }} />
      <EnumSeg value={image.consent} options={CONSENT_OPTIONS} onChange={(v) => patch({ consent: v })} />
      <p
        className={image.consent === 'public' ? 'faint' : 'alert'}
        style={{ fontSize: 11, marginTop: 6 }}
      >
        {CONSENT_NOTE[image.consent]}
      </p>

      <div className="divider" />
      <span className="label">File</span>
      <div style={{ height: 6 }} />
      <input
        ref={fileInput}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {image.file ? (
        <>
          {previewUrl && image.file.mime.startsWith('image/') && (
            <img
              className="exhibit-img"
              src={previewUrl}
              alt={image.title}
              onClick={() => useStore.getState().openLightbox(id)}
            />
          )}
          <dl className="kv" style={{ marginTop: 8 }}>
            <dt>Name</dt>
            <dd className="mono" style={{ fontSize: 11 }}>{image.file.name}</dd>
            <dt>Size</dt>
            <dd className="mono">
              {formatBytes(image.file.bytes)}
              {image.file.w ? ` / ${image.file.w}x${image.file.h}` : ''}
            </dd>
            <dt>sha-256</dt>
            <dd className="hash">{image.file.sha256}</dd>
          </dl>
          <button className="btn btn-sm btn-ghost" style={{ marginTop: 8 }} onClick={() => fileInput.current?.click()}>
            Replace file
          </button>
        </>
      ) : (
        <button className="btn btn-sm" onClick={() => fileInput.current?.click()}>
          {busy ?? 'Add file'}
        </button>
      )}

      <div style={{ height: 12 }} />
      <Field label="IIIF image URL (optional)" hint="A static (level-0) endpoint, used for deep zoom when present.">
        <input
          className="input input-mono"
          placeholder="https://.../info.json"
          value={image.iiif?.imageUrl ?? ''}
          onChange={(e) => patch({ iiif: { ...image.iiif, imageUrl: e.target.value || undefined } })}
        />
      </Field>

      <div className="divider" />
      <span className="label">Source link (optional)</span>
      <p className="faint" style={{ fontSize: 11, margin: '4px 0 8px' }}>
        For an image referenced but not held. Remote bytes are never downloaded.
      </p>
      <Field label="URL">
        <input
          className="input input-mono"
          value={image.link?.url ?? ''}
          onChange={(e) =>
            patch({ link: e.target.value ? { ...image.link, url: e.target.value } : undefined })
          }
        />
      </Field>
      {image.link?.url && (
        <>
          <button className="btn btn-sm" onClick={requestSnapshot}>
            Request archived snapshot
          </button>
          {wb && <p className="faint" style={{ fontSize: 11, marginTop: 6 }}>{wb}</p>}
          {image.link.archivedSha256 && (
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>Archived</dt>
              <dd className="mono" style={{ wordBreak: 'break-all', fontSize: 11 }}>{image.link.archivedUrl}</dd>
              <dt>Snapshot</dt>
              <dd className="hash">sha256:{image.link.archivedSha256}</dd>
            </dl>
          )}
        </>
      )}

      <div className="divider" />
      <span className="label">Subject</span>
      <p className="faint" style={{ fontSize: 11, margin: '4px 0 8px' }}>
        Where the depicted thing is.
      </p>
      <PointFields
        point={image.subject}
        onChange={(p) => patch({ subject: p })}
        onRemove={() => patch({ subject: undefined })}
        onPlace={() => setPlacing({ kind: 'subject', imageId: id })}
        placeLabel="Place subject on map"
        placingActive={placing?.kind === 'subject' && placing.imageId === id}
      />

      <div className="divider" />
      <span className="label">Vantage</span>
      <p className="faint" style={{ fontSize: 11, margin: '4px 0 8px' }}>
        Where the camera was, and the way it looked. Vantages of one object cross.
      </p>
      <PointFields
        point={image.vantage}
        onChange={(p) =>
          patch({
            vantage: {
              ...p,
              bearingDeg: image.vantage?.bearingDeg ?? 0,
              fovDeg: image.vantage?.fovDeg,
              confidence: image.vantage?.confidence ?? 'probable',
            },
          })
        }
        onRemove={() => patch({ vantage: undefined })}
        onPlace={() => setPlacing({ kind: 'vantage', imageId: id })}
        placeLabel="Place camera vantage on map"
        placingActive={placing?.kind === 'vantage' && placing.imageId === id}
      />
      {image.vantage && (
        <div className="vantage-grid">
          <BearingDial
            value={image.vantage.bearingDeg}
            onChange={(deg) => patch({ vantage: { ...image.vantage!, bearingDeg: deg } })}
          />
          <div className="stack" style={{ gap: 8, flex: 1 }}>
            <Field label={`Bearing  ${formatBearing(image.vantage.bearingDeg)}`}>
              <input
                className="input input-mono"
                type="number"
                min={0}
                max={360}
                value={image.vantage.bearingDeg}
                onChange={(e) =>
                  patch({
                    vantage: {
                      ...image.vantage!,
                      bearingDeg: ((parseFloat(e.target.value) % 360) + 360) % 360,
                    },
                  })
                }
              />
            </Field>
            <Field label="Field of view (deg, optional)">
              <input
                className="input input-mono"
                type="number"
                min={0}
                max={180}
                value={image.vantage.fovDeg ?? ''}
                onChange={(e) => {
                  const n = parseFloat(e.target.value)
                  patch({ vantage: { ...image.vantage!, fovDeg: Number.isFinite(n) ? n : undefined } })
                }}
              />
            </Field>
            <Field label="Confidence">
              <EnumSeg<Certainty>
                value={image.vantage.confidence}
                options={CERTAINTY_OPTIONS}
                onChange={(v) => patch({ vantage: { ...image.vantage!, confidence: v } })}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="divider" />
      <span className="label">Plate</span>
      <div style={{ height: 6 }} />
      {activePanel ? (
        onActivePlate ? (
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => useStore.getState().removeImageFromPanel(activePanel.id, id)}
          >
            Remove from active plate
          </button>
        ) : (
          <button
            className="btn btn-sm"
            onClick={() => useStore.getState().addImageToPanel(activePanel.id, id)}
          >
            Add to active plate
          </button>
        )
      ) : (
        <p className="faint" style={{ fontSize: 11 }}>No active plate. Create one in the Plate view.</p>
      )}

      <div className="divider" />
      <Field label="Tags" hint="Comma separated.">
        <input
          className="input"
          value={image.tags.join(', ')}
          onChange={(e) =>
            patch({ tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
          }
        />
      </Field>

      <Field label="Note">
        <textarea
          className="textarea"
          value={image.note ?? ''}
          onChange={(e) => patch({ note: e.target.value || undefined })}
        />
      </Field>

      <div className="divider" />
      {confirmDel ? (
        <div className="btn-row">
          <button className="btn btn-sm btn-danger" onClick={() => useStore.getState().removeImage(id)}>
            Confirm delete
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => setConfirmDel(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="btn btn-sm btn-ghost btn-danger" onClick={() => setConfirmDel(true)}>
          Delete image
        </button>
      )}
      <div style={{ height: 8 }} />
      <div className="row-sub" style={{ padding: 0 }}>
        <Dir text={image.title} /> &nbsp;/&nbsp; id {id}
      </div>
    </div>
  )
}
