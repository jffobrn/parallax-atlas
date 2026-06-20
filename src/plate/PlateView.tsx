import { useRef, useState } from 'react'
import { useStore } from '../state/store'
import { useMediaUrl } from '../state/useMediaUrl'
import { dirOf, type Image, type Panel, type PanelItem } from '../core'

/**
 * The Mnemosyne plate: a board on which images are arranged into a
 * constellation, so meaning emerges from juxtaposition rather than from a list.
 * Several plates can hold different readings of the same corpus. Drag a tile to
 * place it; click to select it everywhere; open it for close looking. Positions
 * are stored normalized (0..1), so a plate reflows to any board size and travels
 * intact into the published dossier.
 */
export function PlateView() {
  const project = useStore((s) => s.project)
  const activePanelId = useStore((s) => s.activePanelId)
  const selectedImageId = useStore((s) => s.selectedImageId)

  const panels = project.panels
  const active = panels.find((p) => p.id === activePanelId) ?? panels[0] ?? null
  const imageById = new Map(project.images.map((i) => [i.id, i]))

  const selectedOnPlate =
    active && selectedImageId
      ? active.items.some((it) => it.imageId === selectedImageId)
      : false
  const canAddSelected = !!active && !!selectedImageId && !selectedOnPlate

  return (
    <div className="plate-wrap">
      <div className="plate-bar">
        {panels.map((p) => (
          <button
            key={p.id}
            className="plate-pill"
            data-on={p.id === active?.id}
            onClick={() => useStore.getState().setActivePanel(p.id)}
            title={p.caption}
          >
            <PanelPillLabel panel={p} />
            <span className="faint mono" style={{ fontSize: 10 }}>{p.items.length}</span>
          </button>
        ))}
        <button className="btn btn-sm btn-ghost btn-mono" onClick={() => useStore.getState().addPanel()}>
          + Plate
        </button>
        <div className="topbar-spacer" />
        <button
          className="btn btn-sm btn-mono btn-primary"
          disabled={!canAddSelected}
          onClick={() =>
            active && selectedImageId &&
            useStore.getState().addImageToPanel(active.id, selectedImageId)
          }
          title={
            canAddSelected
              ? 'Place the selected image on this plate'
              : 'Select an image in the corpus that is not already on this plate'
          }
        >
          + Add selected image
        </button>
      </div>

      {active ? (
        <PlateBoard panel={active} imageById={imageById} />
      ) : (
        <div className="plate-board">
          <div className="plate-empty">
            No plates yet. Create a plate, then arrange images into a constellation.
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-sm btn-primary" onClick={() => useStore.getState().addPanel()}>
                Create the first plate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PanelPillLabel({ panel }: { panel: Panel }) {
  const t = panel.titles[0]?.text ?? 'Plate'
  return <span dir={dirOf(t)}>{t}</span>
}

function PlateBoard({
  panel,
  imageById,
}: {
  panel: Panel
  imageById: Map<string, Image>
}) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const [editingMeta, setEditingMeta] = useState(false)

  const title = panel.titles[0]?.text ?? 'Plate'
  const items = panel.items.filter((it) => imageById.has(it.imageId))

  const setTitle = (text: string) =>
    useStore.getState().updatePanel(panel.id, {
      titles: [{ text, lang: panel.titles[0]?.lang ?? 'en' }, ...panel.titles.slice(1)],
    })

  return (
    <div className="plate-board" ref={boardRef}>
      {items.length === 0 && (
        <div className="plate-empty">
          This plate is empty. Select an image in the corpus and click
          <b> Add selected image</b> to place it here.
        </div>
      )}

      {items.map((it) => {
        const image = imageById.get(it.imageId)
        if (!image) return null
        const pos = drag && drag.id === it.imageId ? drag : it
        return (
          <PlateTile
            key={it.imageId}
            item={{ ...it, x: pos.x, y: pos.y }}
            image={image}
            panelId={panel.id}
            boardRef={boardRef}
            onDrag={(x, y) => setDrag({ id: it.imageId, x, y })}
            onDragEnd={(x, y) => {
              useStore.getState().movePanelItem(panel.id, it.imageId, x, y)
              setDrag(null)
            }}
          />
        )
      })}

      <div className="plate-caption">
        <div className="between">
          <span className="label">Plate</span>
          <button className="btn btn-sm btn-ghost" onClick={() => setEditingMeta((v) => !v)}>
            {editingMeta ? 'Done' : 'Edit'}
          </button>
        </div>
        {editingMeta ? (
          <div className="stack" style={{ gap: 6, marginTop: 6 }}>
            <input
              className="input"
              value={title}
              dir={dirOf(title)}
              placeholder="Plate title"
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="textarea"
              value={panel.caption ?? ''}
              placeholder="Caption: the reading this constellation makes."
              onChange={(e) =>
                useStore.getState().updatePanel(panel.id, { caption: e.target.value || undefined })
              }
            />
            <button
              className="btn btn-sm btn-ghost btn-danger"
              onClick={() => useStore.getState().removePanel(panel.id)}
            >
              Delete plate
            </button>
          </div>
        ) : (
          <>
            <div className="plate-caption-title" dir={dirOf(title)}>{title}</div>
            {panel.caption && (
              <div className="plate-caption-text" dir={dirOf(panel.caption)}>{panel.caption}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PlateTile({
  item,
  image,
  panelId,
  boardRef,
  onDrag,
  onDragEnd,
}: {
  item: PanelItem
  image: Image
  panelId: string
  boardRef: React.RefObject<HTMLDivElement | null>
  onDrag: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
}) {
  const url = useMediaUrl(image.file?.blobKey)
  const selectedImageId = useStore((s) => s.selectedImageId)
  const selected = selectedImageId === image.id
  const moved = useRef(false)
  const start = useRef<{ cx: number; cy: number; x: number; y: number } | null>(null)

  const aspect = image.file?.w && image.file?.h ? image.file.w / image.file.h : 1
  const baseW = 158 * item.scale
  const width = baseW
  const height = baseW / (aspect || 1)

  const boardRect = () => boardRef.current?.getBoundingClientRect()

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    moved.current = false
    start.current = { cx: e.clientX, cy: e.clientY, x: item.x, y: item.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const rect = boardRect()
    if (!rect) return
    const dx = (e.clientX - start.current.cx) / rect.width
    const dy = (e.clientY - start.current.cy) / rect.height
    if (Math.abs(e.clientX - start.current.cx) + Math.abs(e.clientY - start.current.cy) > 3) {
      moved.current = true
    }
    onDrag(
      Math.max(0, Math.min(1, start.current.x + dx)),
      Math.max(0, Math.min(1, start.current.y + dy)),
    )
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return
    const rect = boardRect()
    if (rect && moved.current) {
      const dx = (e.clientX - start.current.cx) / rect.width
      const dy = (e.clientY - start.current.cy) / rect.height
      onDragEnd(
        Math.max(0, Math.min(1, start.current.x + dx)),
        Math.max(0, Math.min(1, start.current.y + dy)),
      )
    } else {
      useStore.getState().selectImage(image.id)
    }
    start.current = null
  }

  return (
    <div
      className="plate-item"
      data-selected={selected}
      data-dragging={!!start.current && moved.current}
      style={{
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        width,
        height,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerEnter={() => useStore.getState().hover(image.id)}
      onPointerLeave={() => useStore.getState().hover(null)}
      onDoubleClick={(e) => {
        e.stopPropagation()
        useStore.getState().openLightbox(image.id)
      }}
    >
      {url ? (
        <img src={url} alt={image.title} draggable={false} />
      ) : (
        <div className="img-thumb-empty" style={{ width: '100%', height: '100%' }}>no file</div>
      )}
      <button
        className="plate-item-zoom"
        title="Look closely"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          useStore.getState().openLightbox(image.id)
        }}
      >
        ⛶
      </button>
      <span className="plate-item-label" dir={dirOf(image.title)}>{image.title}</span>
      {selected && (
        <PlateScaler panelId={panelId} imageId={image.id} scale={item.scale} />
      )}
    </div>
  )
}

function PlateScaler({
  panelId,
  imageId,
  scale,
}: {
  panelId: string
  imageId: string
  scale: number
}) {
  return (
    <div
      style={{ position: 'absolute', bottom: -17, right: 0, display: 'flex', gap: 3 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        className="plate-item-zoom"
        style={{ position: 'static', opacity: 1 }}
        title="Smaller"
        onClick={(e) => {
          e.stopPropagation()
          useStore.getState().scalePanelItem(panelId, imageId, scale - 0.2)
        }}
      >
        −
      </button>
      <button
        className="plate-item-zoom"
        style={{ position: 'static', opacity: 1 }}
        title="Larger"
        onClick={(e) => {
          e.stopPropagation()
          useStore.getState().scalePanelItem(panelId, imageId, scale + 0.2)
        }}
      >
        +
      </button>
    </div>
  )
}
