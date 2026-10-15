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
  return { shouldShift: false, shiftAmount: "0px" };
}
