// RETIRED (#64): nothing imports this file. It was a re-export of ./inspector/
// for the retired barrels. It stays only until the owner removes it from the
// repo.
//
// Re-export of ./inspector/ (hook, class regex, overlay card) for the two
// barrels that import this path (../index.ts, ./index.ts); PreviewTabs imports
// ./inspector directly.
export { InspectorOverlay } from "./inspector"
