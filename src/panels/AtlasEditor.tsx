import {
  dirOf,
  type AtlasSubject,
  type LocalizedText,
  type TimePrecision,
} from '../core'
import { useStore } from '../state/store'
import { PointFields } from '../components/points'
import {
  ATLAS_SUBJECT_OPTIONS,
  EnumSeg,
  Field,
  PRECISION_OPTIONS,
  SelectMenu,
} from '../components/ui'

/**
 * The atlas identity: what place, object, or event the whole image complex is
 * of. Its place anchors the map; its window frames the timeline; its titles are
 * multilingual, direction detected per string.
 */
export function AtlasEditor() {
  const atlas = useStore((s) => s.project.atlas)
  const patchAtlas = useStore((s) => s.patchAtlas)
  const setPlacing = useStore((s) => s.setPlacing)
  const placing = useStore((s) => s.placing)

  const titles = atlas.titles
  const setTitle = (i: number, partial: Partial<LocalizedText>) =>
    patchAtlas({ titles: titles.map((t, j) => (j === i ? { ...t, ...partial } : t)) })
  const addTitle = () => patchAtlas({ titles: [...titles, { text: '', lang: 'en' }] })
  const removeTitle = (i: number) =>
    patchAtlas({ titles: titles.filter((_, j) => j !== i) })

  return (
    <div className="panel-body" style={{ paddingTop: 12 }}>
      <span className="label">Titles</span>
      <p className="faint" style={{ fontSize: 11, margin: '4px 0 8px' }}>
        One per language. Direction is detected per string.
      </p>
      {titles.map((t, i) => (
        <div key={i} className="title-row">
          <input
            className="input"
            dir={dirOf(t.text)}
            value={t.text}
            placeholder="Title"
            onChange={(e) => setTitle(i, { text: e.target.value })}
          />
          <input
            className="input input-mono"
            style={{ width: 56 }}
            value={t.lang}
            aria-label="language"
            onChange={(e) => setTitle(i, { lang: e.target.value })}
          />
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => removeTitle(i)}
            disabled={titles.length <= 1}
            aria-label="remove title"
          >
            &times;
          </button>
        </div>
      ))}
      <button className="btn btn-sm btn-ghost" onClick={addTitle} style={{ marginTop: 4 }}>
        Add title
      </button>

      <div className="divider" />
      <Field label="This atlas is of" hint="What kind of thing the complex assembles.">
        <SelectMenu
          value={atlas.subject}
          options={ATLAS_SUBJECT_OPTIONS.map((o) => ({ value: o.value as AtlasSubject, label: o.label }))}
          onChange={(v) => patchAtlas({ subject: v })}
          ariaLabel="atlas subject"
        />
      </Field>

      <div className="divider" />
      <span className="label">Time window</span>
      <div style={{ height: 6 }} />
      <div className="field-row">
        <Field label="Start (ISO)">
          <input
            className="input input-mono"
            placeholder="1971-01-01"
            value={atlas.window.start ?? ''}
            onChange={(e) =>
              patchAtlas({ window: { ...atlas.window, start: e.target.value || undefined } })
            }
          />
        </Field>
        <Field label="End (ISO)">
          <input
            className="input input-mono"
            placeholder="1994-01-01"
            value={atlas.window.end ?? ''}
            onChange={(e) =>
              patchAtlas({ window: { ...atlas.window, end: e.target.value || undefined } })
            }
          />
        </Field>
      </div>
      <Field label="Window precision">
        <EnumSeg<TimePrecision>
          value={atlas.window.precision}
          options={PRECISION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(v) => patchAtlas({ window: { ...atlas.window, precision: v } })}
        />
      </Field>

      <div className="divider" />
      <Field label="Summary">
        <textarea
          className="textarea"
          style={{ minHeight: 110 }}
          value={atlas.summary ?? ''}
          onChange={(e) => patchAtlas({ summary: e.target.value || undefined })}
        />
      </Field>

      <Field label="Tags" hint="Comma separated.">
        <input
          className="input"
          value={atlas.tags.join(', ')}
          onChange={(e) =>
            patchAtlas({
              tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
        />
      </Field>

      <div className="divider" />
      <span className="label">Atlas place</span>
      <p className="faint" style={{ fontSize: 11, margin: '4px 0 8px' }}>
        Where the object, place, or event is. Anchors the map.
      </p>
      <Field label="Name">
        <input
          className="input"
          value={atlas.place?.name ?? ''}
          placeholder="Place name"
          onChange={(e) =>
            patchAtlas({
              place: atlas.place
                ? { ...atlas.place, name: e.target.value || undefined }
                : { lat: 0, lng: 0, safeToPublish: true, name: e.target.value || undefined },
            })
          }
        />
      </Field>
      <PointFields
        point={atlas.place}
        onChange={(p) => patchAtlas({ place: { ...p, name: atlas.place?.name } })}
        onRemove={() => patchAtlas({ place: undefined })}
        onPlace={() => setPlacing({ kind: 'atlas-place' })}
        placeLabel="Place atlas on map"
        placingActive={placing?.kind === 'atlas-place'}
      />
    </div>
  )
}
