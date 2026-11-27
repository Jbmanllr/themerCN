# Architecture governance: progress and task pool

A running record of the work that reduces architectural entropy in this repository: what was surveyed, what changed, what is left, and what waits on the owner. Started 2026-11-27 on the branch `worktree-architecture-entropy-reduction`. Add to it when a round finishes; delete it once the pool is empty.

How the Themer works inside is [`packages/themer/ARCHITECTURE.md`](../packages/themer/ARCHITECTURE.md); decisions are in [`docs/adr/`](adr/). This file repeats neither.

## Where the code stood

The survey read the repository's standards and both ADRs, built the import graph of every workspace, and scanned for duplicate rules, unused exports, repeated helpers and unowned state.

- **Workspaces.** `themercn` (the Themer, about 250 source files), `@workspace/ui` (the shadcn components, vendored), `apps/web` (the Playground, Next) and `apps/vite` (a second Host app). The apps reach the Themer only through its five package entries, which the `exports` map enforces.
- **Import graph.** No value-import cycle in any workspace. The Themer's directories already formed layers with every import pointing down, and so did the Playground's (`app`, `components`, `lib`). One type-only cycle sat between `types/editor.ts` and `types/index.ts`.
- **Single sources.** Each token family has one list (`types/theme.ts`), each shortcut one definition (`SHORTCUTS`), each storage key one builder (`getStorageKeys`), each shared path one owner module with a cost contract (ADR 0002).
- **State ownership.**

  | State                                     | Owner                                  | Lives in                                   |
  | ----------------------------------------- | -------------------------------------- | ------------------------------------------ |
  | The Theme, its checkpoint, baseline, undo | EditorStore                            | `<ns>:editor` (history in memory only)     |
  | Themer UI choices                         | PreferencesStore                       | `<ns>:preferences`                         |
  | Open, active panel, dialog, inspector     | ThemerUIStore                          | memory                                     |
  | Colour focus and its picker elements      | ColorFocusStore, `use-color-focus.ts`  | memory, a module-level map                 |
  | Light or dark                             | `ColorModeProvider`, or the Host       | `.dark` on `<html>`, `<ns>:color-mode`     |
  | Presets and Host extra colours            | `config/presets.ts`, `extra-colors.ts` | module-level registries, set during render |
  | What was written on a themed document     | `utils/apply-theme.ts`                 | a `WeakMap` per element                    |
  | Font links per document                   | `utils/font-links.ts`                  | a reference-counted registry               |
  | The Google catalog                        | `api/font-catalog.ts`                  | server memory, one day                     |
  | The Playground's cart                     | `apps/web/lib/stores/cart.ts`          | its own store                              |

The repository has no authentication, permissions, database or retry layer beyond the font catalog's, so those headings of a general audit have nothing to act on here.

## Done

Each batch is one commit: baseline, change, callers migrated, old path deleted, checks run.

| Batch | Change                                                                                                                                                                                                     | Guard against its return                                                   |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1     | The editor store's `canUndo()` and `canRedo()` duplicated the `selectCanUndo` and `selectCanRedo` selectors. The selectors stay; the shortcuts call `undo` and `redo`, which do nothing when empty.        | The store's type no longer has the methods; a store test covers the no-op. |
| 2     | `ThemerLayout` moved to `types/editor.ts`, ending the type cycle. The `components/sidebar` and `components/themer-ui` barrels, one importer each, are gone. `hooks/use-themer.ts` is `use-toggle-mode.ts`. | None for the cycle (see the pool).                                         |
| 3     | `isSidebarSynced` had no production caller and is removed; `transformGoogleFontsResponse` is no longer exported.                                                                                           | None (see the pool: unused exports).                                       |
| 4     | The import layers of the Themer and the Playground are a lint rule ([ADR 0003](adr/0003-import-layers.md)). No code moved.                                                                                 | `lint`, plus a repo test that the rule fires on one probe per layer.       |
| 5     | Every console message starts with `[themercn]`; there were five spellings.                                                                                                                                 | The convention is in `ARCHITECTURE.md`; only the loader's is tested.       |

## Task pool

Safe to do without a decision, in rough order of value.

1. **`getColorElement` and `resetFontCatalogCache` exist for tests.** Rewrite the two tests through the modules' interfaces (`focusColor` finding a registered picker; a fresh module per test), then delete the exports.
2. **The `selectors/index.ts` barrel.** It re-exports one module, and the store imports that module directly. Removing it means editing an import in `store-action.count.test.tsx`, a gate file, so the commit needs a `Quality-change` trailer.
3. **The Playground's dashboard formats numbers on its own.** `components/app/dashboard.tsx` builds a percent and a week formatter and a dollar string beside `lib/format.ts`. Move them there if a second caller appears; today they have one.
4. **`apps/web/hooks/` holds only a `.gitkeep`.** Remove it unless `components.json` needs the alias target to exist.

## Waiting on the owner

Each of these changes a contract, adds a dependency, or moves many files.

1. **An unused-export check (for example `knip`).** The survey found about forty exports with no reader outside their file, mostly types. A tool would keep them from returning; it is a new dev dependency and a new check.
2. **A cycle check inside a layer.** ADR 0003's rule checks direction between layers only. A resolving checker (`eslint-plugin-import`, `dependency-cruiser`) would catch cycles; the ADR rejected it for now as a second run over every file.
3. **Validate what the stores read from `localStorage`.** `mergeEditorState` casts the stored entry to its type. An entry of the right version and the wrong shape (hand-edited, or written by a bug) reaches the editor unchecked. A schema parse at hydration would fix it, on the page-load path, whose parse counts are capped.
4. **The Preset and extra-colour registries are module state set during render.** It works because a page mounts one `<Themer>`. Owning them in a store, or passing them down, is a change to the mount sequence.
5. **The font code spans five directories** (`api`, `utils`, `hooks`, `types`, `components/editor`), and `utils` holds owner modules such as `apply-theme.ts`. Grouping by domain would move files the Quality register names in its commands, which needs the owner.
6. **Colour warnings log in production.** `colorFormatter` and the contrast maths warn on an unparseable colour in every build, where the Host-usage warnings are development-only. Whether a Host's production console should see them is a product call.

## Looked at and left

- **`@workspace/ui`.** Vendored shadcn components; every one has a reader.
- **Two light/dark types.** `ThemerColorMode` is the public prop's type and `ThemeMode` the Theme's own; they may diverge, so they stay separate.
- **`useIsMobile` in the Themer beside `use-mobile` in `@workspace/ui`.** Different breakpoints, on purpose (`ARCHITECTURE.md`).
- **The head script's own font-name extractor.** It duplicates the Theme fonts module in ES5 because the script imports nothing; a parity test ties the two.
- **Four Vitest configs repeat the test-slot setup.** Each workspace runs alone, and a repo test checks the wiring.
- **The inspector barrel.** It is the inspector module's interface, named in ADR 0002, with three readers.
