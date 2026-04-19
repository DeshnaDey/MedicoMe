// Empty starting state. The prototype is meant to be lived-in — users add
// their own records, events, and chat sessions from scratch.
// Kept as a function (not a constant) so future user-initiated seed-loading
// would just replace this body.

import type { AppState } from './types'

export function buildSeed(): AppState {
  return {
    settings: {
      searchRadiusKm: 5,
      patientName: '',
    },
    records: [],
    events: [],
    chatSessions: [],
    account: null,
    seeded: true,
  }
}
