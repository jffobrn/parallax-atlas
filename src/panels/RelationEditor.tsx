import {
  type Certainty,
  type Relation,
} from '../core'
import { useStore } from '../state/store'
import {
  CERTAINTY_OPTIONS,
  Dir,
  EnumSeg,
  Field,
  RELATION_KIND_OPTIONS,
  SelectMenu,
  Toggle,
} from '../components/ui'

/**
 * Edit one relation: the typed edge that helps make the corpus a complex. The
 * endpoints are clickable to jump to either image; a relation can read one way
 * or symmetrically, and carries its own certainty.
 */
export function RelationEditor({ relation }: { relation: Relation }) {
  const project = useStore((s) => s.project)
  const patch = (partial: Partial<Relation>) =>
    useStore.getState().updateRelation(relation.id, partial)

  const from = project.images.find((i) => i.id === relation.from)
  const to = project.images.find((i) => i.id === relation.to)

  return (
    <div className="panel-body" style={{ paddingTop: 12 }}>
      <span className="label">Endpoints</span>
      <div style={{ height: 6 }} />
      <button className="rel-row" onClick={() => useStore.getState().selectImage(relation.from)}>
        <span className="rel-kind">from</span>
        <span className="rel-target"><Dir text={from?.title ?? 'missing image'} /></span>
      </button>
      <div className="between" style={{ margin: '2px 0' }}>
        <span className="faint mono" style={{ fontSize: 11 }}>{relation.directed ? '→ directed' : '↔ mutual'}</span>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => patch({ from: relation.to, to: relation.from })}
          title="Swap from and to"
        >
          Swap
        </button>
      </div>
      <button className="rel-row" onClick={() => useStore.getState().selectImage(relation.to)}>
        <span className="rel-kind">to</span>
        <span className="rel-target"><Dir text={to?.title ?? 'missing image'} /></span>
      </button>

      <div className="divider" />
      <Field label="Relation">
        <SelectMenu
          value={relation.kind}
          options={RELATION_KIND_OPTIONS}
          onChange={(v) => patch({ kind: v })}
          ariaLabel="relation kind"
        />
      </Field>

      <Field label="Direction">
        <Toggle
          checked={relation.directed}
          onChange={(v) => patch({ directed: v })}
          label={relation.directed ? 'directed (from -> to)' : 'mutual'}
        />
      </Field>

      <Field label="Certainty">
        <EnumSeg<Certainty>
          value={relation.certainty}
          options={CERTAINTY_OPTIONS}
          onChange={(v) => patch({ certainty: v })}
        />
      </Field>

      <Field label="Note">
        <textarea
          className="textarea"
          value={relation.note ?? ''}
          onChange={(e) => patch({ note: e.target.value || undefined })}
        />
      </Field>

      <div className="divider" />
      <button
        className="btn btn-sm btn-ghost btn-danger"
        onClick={() => useStore.getState().removeRelation(relation.id)}
      >
        Delete relation
      </button>
    </div>
  )
}
