import * as Select from '@radix-ui/react-select'
import type { KeyboardEvent, ReactNode } from 'react'
import {
  dirOf,
  type AtlasSubject,
  type Certainty,
  type Consent,
  type ImageKind,
  type RelationKind,
} from '../core'

/**
 * Make a clickable row keyboard-activatable like a button: focusable, with Enter
 * or Space triggering the action. Spread onto the row element:
 *   <div className="row" {...rowButton(() => select(id))}>
 * A keypress that bubbles up from a nested control (a real button inside the
 * row) is ignored via the target/currentTarget guard, so secondary buttons keep
 * their own behaviour.
 */
export function rowButton(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
        e.preventDefault()
        onActivate()
      }
    },
  }
}

/** A stat readout: a bold count followed by its noun, pluralized to match. */
export function Count({ n, noun }: { n: number; noun: string }) {
  return (
    <>
      <b>{n}</b> {n === 1 ? noun : `${noun}s`}
    </>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
      {hint && <span className="faint" style={{ fontSize: 11 }}>{hint}</span>}
    </div>
  )
}

/** Text that picks its own direction (and Arabic font) from its content. */
export function Dir({
  text,
  className,
  title,
}: {
  text: string
  className?: string
  title?: string
}) {
  return (
    <span dir={dirOf(text)} className={className} title={title}>
      {text}
    </span>
  )
}

export interface EnumOption<T extends string> {
  value: T
  label: string
}

/** A compact segmented control for short enums (precision, certainty, consent). */
export function EnumSeg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: EnumOption<T>[]
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      data-on={checked}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-track">
        <span className="switch-thumb" />
      </span>
      {label && <span style={{ fontSize: 12 }}>{label}</span>}
    </button>
  )
}

/** Themed Radix Select for longer enums (image kind, relation kind). */
export function SelectMenu<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: EnumOption<T>[]
  onChange: (v: T) => void
  ariaLabel?: string
}) {
  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <Select.Trigger className="select-trigger" aria-label={ariaLabel}>
        <Select.Value />
        <Select.Icon>▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="select-content" position="popper" sideOffset={4}>
          <Select.Viewport>
            {options.map((o) => (
              <Select.Item key={o.value} value={o.value} className="select-item">
                <Select.ItemText>{o.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

export function ConsentBadge({ consent }: { consent: Consent }) {
  return <span className={`badge badge-${consent}`}>{consent}</span>
}

export function CertaintyBadge({ certainty }: { certainty: Certainty }) {
  return <span className={`badge badge-${certainty}`}>{certainty}</span>
}

const KIND_LABEL: Record<ImageKind, string> = {
  photograph: 'PHOTO',
  reproduction: 'REPRO',
  'film-still': 'STILL',
  document: 'DOC',
  artwork: 'WORK',
  other: 'OTHER',
}

export function KindBadge({ kind }: { kind: ImageKind }) {
  return (
    <span className="row-sub" style={{ margin: 0 }}>
      <span className="kind-dot" />
      {KIND_LABEL[kind]}
    </span>
  )
}

// Shared option lists.
export const CONSENT_OPTIONS: EnumOption<Consent>[] = [
  { value: 'public', label: 'PUBLIC' },
  { value: 'restricted', label: 'RESTRICTED' },
  { value: 'embargoed', label: 'EMBARGOED' },
]

export const CERTAINTY_OPTIONS: EnumOption<Certainty>[] = [
  { value: 'attested', label: 'ATTESTED' },
  { value: 'probable', label: 'PROBABLE' },
  { value: 'uncertain', label: 'UNCERTAIN' },
]

export const PRECISION_OPTIONS = [
  { value: 'minute', label: 'MIN' },
  { value: 'hour', label: 'HOUR' },
  { value: 'day', label: 'DAY' },
  { value: 'approximate', label: 'APPROX' },
] as const

export const IMAGE_KIND_OPTIONS: EnumOption<ImageKind>[] = [
  { value: 'photograph', label: 'Photograph (file)' },
  { value: 'reproduction', label: 'Reproduction (file)' },
  { value: 'film-still', label: 'Film still (file)' },
  { value: 'artwork', label: 'Artwork (file)' },
  { value: 'document', label: 'Document (file)' },
  { value: 'other', label: 'Other' },
]

export const RELATION_KIND_OPTIONS: EnumOption<RelationKind>[] = [
  { value: 'same-object', label: 'Shows the same object' },
  { value: 'same-place', label: 'Shows the same place' },
  { value: 'depicts-same', label: 'Depicts the same subject' },
  { value: 'derived-from', label: 'Derived from (copy, scan, crop)' },
  { value: 'detail-of', label: 'Detail of' },
  { value: 'before-after', label: 'Before / after' },
  { value: 'same-source', label: 'Shares a source' },
  { value: 'responds-to', label: 'Responds to' },
  { value: 'other', label: 'Other' },
]

/** Short labels for the apparatus (graph edges, dense rows). */
export const RELATION_KIND_SHORT: Record<RelationKind, string> = {
  'same-object': 'same object',
  'same-place': 'same place',
  'depicts-same': 'depicts same',
  'derived-from': 'derived from',
  'detail-of': 'detail of',
  'before-after': 'before / after',
  'same-source': 'same source',
  'responds-to': 'responds to',
  other: 'related',
}

export const ATLAS_SUBJECT_OPTIONS: EnumOption<AtlasSubject>[] = [
  { value: 'object', label: 'An object or work' },
  { value: 'place', label: 'A place' },
  { value: 'event', label: 'An event' },
  { value: 'person', label: 'A person' },
  { value: 'corpus', label: 'A corpus' },
]
