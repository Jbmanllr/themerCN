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
_Avoid_: template, default theme
