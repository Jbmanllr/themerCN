# Shared paths and their cost contracts

Most Themer features run on a few shared units of work: a store action, a Theme apply, a page load, an inspector pointer move and a font catalog request. Each feature adds its own slice to these paths, so their total cost per unit is decided here, path by path, instead of drifting one correct feature at a time. The cost matters because the Theme updates live. A slider drag commits a store action on every pointer step, and each step applies the Theme to the Host page and, with Workspace on the Live tab, to the Live frame too, so per-unit work multiplies with every editing gesture.

A cost contract is a set of counts of counted work per unit (parses, compiles, storage reads and writes, stringifies, layout reads, network round trips). Durations stay targets. The quality register in the testing standard holds the measured figures and enforced limits; this ADR holds the caps.

## Decision

| Path                   | Unit                                                                                                                                                                              | Owner module                | Cost contract (counted work per unit) | Benchmark             | Register rows                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store action           | one `set` on the editor store or the preferences store                                                                                                                            | the store module            | see Store action below                | none (owner decision) | stringifies, storage writes, store deep compares, selector deep compares, selector colour parses                                                                                        |
| Theme apply            | one `themeState` change written onto one document's `<html>`; the Host page and the Live frame each count as a unit                                                               | the apply-theme module      | see Theme apply below                 | none (owner decision) | property writes, shadow colour parses, CSSOM walks, font label layout reads, font label stringifies                                                                                     |
| Page load              | one HTML load, Host page or Live frame navigation, from the pre-paint head script to the first Theme apply; a `storageNamespace` switch is a second entry point for the same unit | the Themer's mount sequence | see Page load below                   | none (owner decision) | head-script builds, storage reads, storage writes, restore-sheet writes, stylesheet inserts, font links, Preset deep compares, first applies, frame chunk imports, root-class observers |
| Inspector pointer move | one `mousemove` over the inspected surface while the inspector is on, plus one measured frame; scroll and resize schedule the same measure                                        | the inspector module        | see Inspector pointer move below      | none (owner decision) | regex compiles, store sets, ancestor walks, `closest(ignore)` calls, other DOM queries, measures, layout reads per measure                                                              |
| Font catalog request   | one catalog page request: the server route, a client fetch (including the "Custom font" badge lookup), or the in-browser fallback over the bundled fonts                          | Owner to be decided         | to be decided                         | to be decided         | to be decided                                                                                                                                                                           |

For each path, the plug-in rule, what is built once and at which scope, and what a switched-off feature removes are decided with its owner module. Until then, "Owner to be decided" is an open question that blocks the tickets extending that path.

### Store action

- **Owner module:** the Themer's store module: the editor store, the preferences store, their persistence and the published selectors. Its interface is the store actions and the published selectors.
- **Plug-in rule:** a feature changes state only through a store action, and reads it through a selector. A selector does no parse, deep compare, stringify or layout read per run. Values derived from the Theme come from the store module, not from each caller.
- **Cost contract per set:** at most 1 `JSON.stringify` and 1 `localStorage.setItem` when the persisted slice changed, none otherwise. No `localStorage.getItem`. At most 3 Theme deep compares in the store on a set that changes the Theme, none on a set that only changes history. At most 1 Theme deep compare across all selectors, whatever the number of callers. No colour parse in a selector. At most 1 `getComputedStyle`, only while unset Host extra colours are registered. Slider steps stay undebounced: the rate is not part of the contract.
- **Built once:** whether the Theme is on its Preset, and what persists, once per Theme state; the shadow colour parse once per value.
- **Switched off:** Sidebar Sync off removes its lookups.
- **Benchmark:** none. The product doesn't need one for this path.
- **Debt today:** history-only sets run 2 store deep compares, every `useIsOnPreset` caller runs its own, and the Shadow control's selector parses the shadow colour on every set.

### Theme apply

- **Owner module:** the Themer's apply-theme module. Its interface computes the properties a Theme writes for one mode, and applies a Theme to, or removes it from, a document: variables on `<html>`, the shadow override sheet and, in the Live frame, the Theme fonts. Its callers are one store subscription per themed document: the Themer's provider for the Host page, and the Live view for the Live frame, which also applies on each frame load.
- **Plug-in rule:** a feature writes Theme output onto a themed document only through the apply-theme module, and adds no second subscription for a document. Values derived from the Theme are computed in its property step, not by each caller. A feature that observes `<html>`'s style counts its work against this contract.
- **Cost contract per apply and document:** a `setProperty` only for a property whose value changed since the last apply to that element, plus a `removeProperty` for each property the Theme dropped. At most 1 shadow colour parse per Theme state, only when the Theme has its own shadows and a shadow input changed. At most 1 CSSOM walk and 1 override sheet write, only when the Theme has its own shadows and the document's stylesheet count changed, skipping the Themer's own sheets. At most 1 `getElementById` for the restore sheet. No `classList` toggle. In the Live frame, at most 1 Theme font update, with a `<link>` append only for a newly named family. Per mounted font label: at most 1 `getComputedStyle`, 1 `JSON.stringify`, and 1 `JSON.parse` only when its description changed. Slider steps stay undebounced: the rate is not part of the contract.
- **Built once:** the property map once per Theme state and mode, shared by every themed document; the shadow colour parse once per shadow input value; the Theme font families once per Theme state, from the store module.
- **Switched off:** Theme override off removes both subscriptions and everything they wrote. Workspace off the Live tab removes the Live frame's unit. A Theme without its own shadows removes the shadow parse, the CSSOM walk and the override sheet.
- **Benchmark:** none. The product doesn't need one for this path.
- **Debt today:** every apply writes all 46 properties, 54 with own shadows, even for a one-token edit. The property map and the shadow colour parse run once per document and apply, so twice with Workspace on the Live tab, even when the shadow inputs didn't change. The CSSOM walk also reads the Themer's own sheet, about 250 kB. The font families are derived on the Host and again on each Live frame apply. A font label reads `getComputedStyle` once per `var()` hop, up to 4.

### Page load

- **Owner module:** the Themer's mount sequence, `<Themer>` and its provider's mount effects. It owns the stage order: the pre-paint head script, the Themer chunk import, store hydration, the Preset adopt and refresh, the first Theme apply, then the font links. The head script stays an isolated stage that imports only constants: the storage keys, the versions and the restore sheet's id. Store hydration belongs to the store module and the first apply to the Theme apply path.
- **Plug-in rule:** a feature that needs work at page load adds a stage to the mount sequence, and that stage reads the hydrated stores. It never reads storage itself. The head script reads only what the stores persist, and it gains a read only for something that must be right before first paint.
- **Cost contract per load:**
  - Storage: the head script does at most 3 `localStorage.getItem` and 2 `JSON.parse`; hydration does at most 2 of each, on a load or on a `storageNamespace` switch. No storage write when the stored values are current. At most 1 write per store whose entry is at another version. At most 1 colour-mode write, only when the saved mode differs, or when an entry exists while the mode is controlled.
  - DOM: at most 1 restore-sheet write, only with a saved Theme and the override on. At most 1 Themer stylesheet insert per Host page, none in a Live frame. At most 1 font `<link>` per Google family per document, for at most 4 families.
  - Store: at most 3 Theme deep compares across the Preset adopt and refresh, and at most 2 store sets (adopt or refresh, and the mode sync).
  - Theme apply: exactly 1 first apply per Host page load, then 1 restore-sheet removal.
  - Live frame: no Themer chunk import.
  - Durations and the Themer stylesheet's size stay targets.
- **Built once:** the head-script string once per `storageNamespace` in each JS realm; its font-name lists and declaration patterns once per script run; the Themer chunk and its stylesheet once per Host page; the Preset id order once per Preset registry; one `<html>` class observer per document, shared by every subscriber.
- **Switched off:** the Themer off removes the import, the stylesheet, the hydration and the observers, and leaves the head script, which changes nothing when nothing is saved. The Theme override off removes the restore sheet, the head script's font links and the first apply. A controlled colour mode removes the colour-mode write, except to clear an existing entry.
- **Benchmark:** none. The product doesn't need one for this path; the existing count tests stay.
- **Debt today:**
  - Next builds the head-script string 3 times per load (server render, hydration render, post-hydration render). The script rebuilds its font-name lists on each call, and its 2 patterns for each declaration.
  - The colour mode is written on every load.
  - The font loader adds a second `<link>` for each family the head script already linked: up to 7 links for 4 families.
  - The first apply runs twice when the saved mode differs from the page's.
  - Every Live frame navigation imports the Themer chunk only to render nothing.
  - Every `useColorMode` caller and every font label adds its own `<html>` observer.
  - Each Preset picker mount re-sorts the Preset ids.

### Inspector pointer move

- **Owner module:** the inspector module: `useInspector` and `InspectorOverlay`. Its interface takes a surface to inspect, an optional `ignore` selector and a pick callback, and returns the state the overlay draws. Workspace's `PreviewTabs` (a Preview tab or the Live frame) and the in-place layouts' `PageInspector` (the Host page, ignoring the Themer's own tree) are its two entry points, both adapters; only one is bound at a time, the one whose layout holds the inspector.
- **Plug-in rule:** a feature adds its work through the module's stages, select, measure and overlay, never through its own pointer, scroll or resize listener. A new entry point mounts one of the two adapters. No layout read outside the measure stage, no store action on a pointer move (a pick may call the colour focus once), and nothing per move that depends only on the session's inputs.
- **Cost contract per pointer move:** 0 regex compiles. 0 store sets. At most 1 ancestor walk, testing each class of a walked element at most once. At most 1 `closest(ignore)`. At most 2 other DOM queries (`contains`, the card's `closest`), only while a card is shown. No measure on a move that keeps the same element; at most 1 measure per animation frame, scheduled by a new element, a scroll or a resize. Per measure, at most 3 `getBoundingClientRect` plus the frame's `clientLeft` and `clientTop`. The overlay re-renders only when the measured state changed. The pointer-move rate is not throttled and is not part of the contract.
- **Built once:** the class regex, once per registration of Host extra colours; the listeners, once per binding (inspector on, tab, frame load); a class's segmentation, once per class shown.
- **Switched off:** the inspector off, or on mobile in Workspace, removes every listener and the pending frame, not just the card.
- **Benchmark:** none. The product doesn't need one for this path.
- **Debt today:** on the in-place layouts the surface is the Host page's `<html>`, so every move runs `closest(ignore)` twice, once on the surface and once in the outside-move check.

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

Handing the head script's parsed entries to the stores, through a global, was rejected: it would break the head-script entry's isolation from Themer code to save two parses per load.
