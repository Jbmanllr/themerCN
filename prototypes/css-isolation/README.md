# PROTOTYPE: Themer CSS isolation (throwaway)

Answers [Should the Themer's CSS be isolated by class prefix or by root-attribute scoping?](https://github.com/Jbmanllr/themerCN/issues/11).
Never merged; kept on the `prototype/css-isolation` branch as a primary source.

```bash
pnpm install
pnpm proto   # generates the variant trees + CSS, serves http://localhost:5199
```

- `apps/web`: a hostile Host app. It has its own Tailwind build, a private type scale, and legacy unlayered CSS. It mounts the Themer stand-in under each variant (`?variant=`, ← → or the bottom bar; "Open popups" adds `&open=1`).
- `packages/ui`: the shadcn Base UI components (Luma). The only edit is an opt-in portal container context in the 5 portalled components.
- `packages/themer-spike`: `src/panel.tsx` is a Themer UI stand-in built from `packages/ui`. `scripts/gen.mjs` copies it with `packages/ui` into `gen/plain` and `gen/tm`, where an AST rewrite prefixes every class. `scripts/build-css.mjs` precompiles `dist/{none,prefix,scoped}.css`.
- The probe table diffs computed styles against clean reference frames: the Themer without the Host app's CSS, and the Host app without the Themer's.
