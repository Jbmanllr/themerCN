// RETIRED (#64): nothing imports this file. It was a stub that always answered
// "no shift"; the Themer layouts own the page offset. It stays only until the
// owner removes it from the repo.
/**
 * Derived state hook for content shift behavior.
 *
 * The live preview is embedded in the Themer UI now, so the host page behind
 * it should never be translated when switching preview tabs.
 *
 * @returns shouldShift - whether content should be shifted
 * @returns shiftAmount - CSS value for shift amount
 */
export function useContentShift() {
  return { shouldShift: false, shiftAmount: "0px" }
}
