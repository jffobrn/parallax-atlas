/**
 * Atlas / Parallax shared core.
 *
 * The typed data layer, the consent boundary (publicClone), fixity hashing,
 * resection geometry, persistence, and apparatus formatting. This is the same
 * spine Sightlines established; Atlas reuses it and extends the model with
 * relations and Mnemosyne plates. Nothing in this folder imports React or
 * touches the network.
 */

export * from './types'
export * from './appInfo'
export * from './id'
export * from './hash'
export * from './geo'
export * from './time'
export * from './format'
export * from './consent'
export * from './db'
export * from './projectFile'
