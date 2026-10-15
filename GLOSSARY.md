# themerCN

A live theme editor for shadcn design tokens, plus the demo site used to exercise it.

## Language

**Themer**:
The theme editor package: it edits a shadcn theme's design tokens and applies them live to the page it is mounted on.
_Avoid_: theme editor package, themer package, tweakcn

**Theme**:
A complete set of design-token values for light and dark modes.
_Avoid_: palette, style

**Playground**:
The demo site in this repo, with fictional content, whose screens exist to show every surface a Theme affects.
_Avoid_: fake website, demo app, sandbox

**Host app**:
Any application that mounts the Themer.
_Avoid_: consumer, client app

**Adapter**:
The framework-specific glue that lets a Host app built on a given framework mount the React-only Themer.
_Avoid_: integration, plugin

**Preset**:
A named Theme offered as a starting point, either built into the Themer or supplied by a Host app.
_Avoid_: template, default theme, shadcn preset (that is a **shadcn style**)

**shadcn style**:
The look the repo's components are installed with (Nova, Luma, …), fixed in the component source; the Themer cannot change it.
_Avoid_: shadcn preset, Preset

**Themer UI**:
The Themer's own interface in any Themer layout: its sidebar or toolbar, header, controls and the popups they open. It always shows the Theme being edited.
_Avoid_: chrome, editor UI, panel

**Preview**:
Any surface that exists to display the Theme: a built-in preview page or the Live view of the Host app's page.
_Avoid_: demo, sample page

**Themer layout**:
How the Themer UI is arranged on screen while it is open: Workspace, Overlay, Push or Toolbar. The Host app sets the default; the user can switch, and the choice is remembered. Small screens always get the same bottom drawer, whatever the Themer layout.
_Avoid_: layout (alone; a Host app has its own layouts), mode (that is light/dark), view

**Workspace**:
The Themer layout that covers the whole page: the sidebar beside the Preview. The only Themer layout with Preview tabs.
_Avoid_: full-screen mode, studio, overlay

**Overlay**:
The Themer layout where the sidebar floats over the Host app's real page, which stays usable beside it.
_Avoid_: floating mode; overlay for the whole Themer UI

**Push**:
The Themer layout where the sidebar sits beside the Host app's real page and shifts it aside instead of covering it.
_Avoid_: inset, docked

**Toolbar**:
The Themer layout with no sidebar: every control sits in a bar over the Host app's real page, each group of controls opening in its own popup.
_Avoid_: header mode, top bar
