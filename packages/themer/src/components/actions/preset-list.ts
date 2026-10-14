// Adapted from tweakcn (Apache-2.0, github.com/jnsahaj/tweakcn @ a3b47b37); modified for themercn.
//
// Pure list logic behind the preset picker (tweakcn
// components/editor/theme-preset-select.tsx): search filtering, prev/next
// cycling and the random pick all work on the *filtered* list, so with a
// search typed the arrows and the shuffle stay among the matching themes.
// The "New" badge rule and the unsaved `*` are tweakcn's too.

/** Days a preset counts as new after its `createdAt` (tweakcn: 5). */
const NEW_PRESET_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Preset ids whose id or label contains the search (case-insensitive). */
export function filterPresetIds(
  presetIds: readonly string[],
  search: string,
  getLabel: (presetId: string) => string,
): string[] {
  const query = search.trim().toLowerCase();
  if (!query) return [...presetIds];
  return presetIds.filter((presetId) =>
    `${presetId} ${getLabel(presetId)}`.toLowerCase().includes(query),
  );
}

/**
 * The preset before or after `current` in `presetIds`, wrapping around.
 * When `current` is not in the list (filtered out), "next" starts at the
 * first entry and "prev" at the last. Undefined for an empty list.
 */
export function cyclePresetId(
  presetIds: readonly string[],
  current: string | undefined,
  direction: "prev" | "next",
): string | undefined {
  const count = presetIds.length;
  if (count === 0) return undefined;
  const index = current === undefined ? -1 : presetIds.indexOf(current);
  if (index === -1) {
    return direction === "next" ? presetIds[0] : presetIds[count - 1];
  }
  const step = direction === "next" ? 1 : -1;
  return presetIds[(index + step + count) % count];
}

/**
 * A random preset from the list other than `current` (the current one only
 * when it is the sole entry). `random` returns [0, 1), like Math.random.
 */
export function pickRandomPresetId(
  presetIds: readonly string[],
  current: string | undefined,
  random: () => number = Math.random,
): string | undefined {
  const others = presetIds.filter((presetId) => presetId !== current);
  const pool = others.length > 0 ? others : presetIds;
  if (pool.length === 0) return undefined;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index];
}

/** Whether a preset created at `createdAt` is within NEW_PRESET_DAYS. */
export function isPresetNew(
  createdAt: string | undefined,
  now: number = Date.now(),
): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return created > now - NEW_PRESET_DAYS * DAY_MS;
}

/** The trigger label: the preset's label, with `*` while edits are unsaved. */
export function formatPresetTriggerLabel(
  label: string,
  hasUnsavedChanges: boolean,
): string {
  return hasUnsavedChanges ? `${label}*` : label;
}
