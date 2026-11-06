# Shared paths and their cost contracts

Most Themer features run on a few shared units of work: a store action, a Theme apply, a page load, an inspector pointer move and a font catalog request. Each feature adds its own slice to these paths, so their total cost per unit is decided here, path by path, instead of drifting one correct feature at a time. The cost matters because the Theme updates live. A slider drag commits a store action on every pointer step, and each step applies the Theme to the Host page and, with Workspace on the Live tab, to the Live frame too, so per-unit work multiplies with every editing gesture.

A cost contract is a set of counts of counted work per unit (parses, compiles, storage reads and writes, stringifies, layout reads, network round trips). Durations stay targets. The quality register in the testing standard holds the measured figures and enforced limits; this ADR holds the caps.

## Decision

| Path                   | Unit                                                                                                                                                                              | Owner module        | Cost contract (counted work per unit) | Benchmark             | Register rows                                                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| Store action           | one `set` on the editor store or the preferences store                                                                                                                            | the store module    | see Store action below                | none (owner decision) | stringifies, storage writes, store deep compares, selector deep compares, selector colour parses |
| Theme apply            | one `themeState` change written onto one document's `<html>`; the Host page and the Live frame each count as a unit                                                               | Owner to be decided | to be decided                         | to be decided         | to be decided                                                                                    |
| Page load              | one HTML load, Host page or Live frame navigation, from the pre-paint head script to the first Theme apply; a `storageNamespace` switch is a second entry point for the same unit | Owner to be decided | to be decided                         | to be decided         | to be decided                                                                                    |
| Inspector pointer move | one `mousemove` over the inspected surface while the inspector is on, plus one measured frame; scroll and resize schedule the same measure                                        | Owner to be decided | to be decided                         | to be decided         | to be decided                                                                                    |
| Font catalog request   | one catalog page request: the server route, a client fetch (including the "Custom font" badge lookup), or the in-browser fallback over the bundled fonts                          | Owner to be decided | to be decided                         | to be decided         | to be decided                                                                                    |

For each path, the plug-in rule, what is built once and at which scope, and what a switched-off feature removes are decided with its owner module. Until then, "Owner to be decided" is an open question that blocks the tickets extending that path.

### Store action

- **Owner module:** the Themer's store module: the editor store, the preferences store, their persistence and the published selectors. Its interface is the store actions and the published selectors.
- **Plug-in rule:** a feature changes state only through a store action, and reads it through a selector. A selector does no parse, deep compare, stringify or layout read per run. Values derived from the Theme come from the store module, not from each caller.
- **Cost contract per set:** at most 1 `JSON.stringify` and 1 `localStorage.setItem` when the persisted slice changed, none otherwise. No `localStorage.getItem`. At most 3 Theme deep compares in the store on a set that changes the Theme, none on a set that only changes history. At most 1 Theme deep compare across all selectors, whatever the number of callers. No colour parse in a selector. At most 1 `getComputedStyle`, only while unset Host extra colours are registered. Slider steps stay undebounced: the rate is not part of the contract.
- **Built once:** whether the Theme is on its Preset, and what persists, once per Theme state; the shadow colour parse once per value.
- **Switched off:** Sidebar Sync off removes its lookups.
- **Benchmark:** none. The product doesn't need one for this path.
- **Debt today:** history-only sets run 2 store deep compares, every `useIsOnPreset` caller runs its own, and the Shadow control's selector parses the shadow colour on every set.

## Considered Options

These candidates are not shared paths:

- **Keydown:** 1 to 5 shortcut listeners per keystroke, each doing a lowercase and a few modifier checks, with no parse or compile. A feature that adds counted work per keystroke reopens it.
- **Playground routes and the built-in Preview example pages:** demo content no Themer feature runs on. The example pages read no editor state, and only the active tab mounts.
- **Code dialog generation and the contrast checker:** they run only while their dialog is open, as store-action subscribers.
- **Import CSS and the View Transition on a mode toggle:** once per user action, then feeding the store action or the Theme apply.
- **Colour focus, the font row preview links and the Preset picker list:** once per pick, or only while the picker or popover is open.
- **Mobile drawer and layout switching, and the Lenis pause and scroll lock:** once per switch, open or close, with no per-unit fan-out.
- **Build-time CSS and the package checks:** build time, not a runtime unit.

Keeping the pre-paint head script as its own path was rejected: it shares its unit and its saved-Theme reads with the Themer's mount and hydration, so it is one stage of the page load.
