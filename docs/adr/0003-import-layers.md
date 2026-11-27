# Import layers are a lint rule, matched by specifier

The Themer's source and the Playground's are layered by directory, and imports point one way. Until now only the Themer's architecture notes said so. Each workspace's ESLint config now states its layers as a table, and `importLayers` (in the shared ESLint config) turns the table into `no-restricted-imports` blocks, so an import that points up fails `lint`, the check every change already runs. A repo test lints one probe import per layer and expects the rule to fire.

| Workspace  | Layer        | May import                                                 |
| ---------- | ------------ | ---------------------------------------------------------- |
| Themer     | `types`      | nothing                                                    |
| Themer     | `config`     | `types`                                                    |
| Themer     | `utils`      | `config`, `types`                                          |
| Themer     | `selectors`  | `config`, `types`, `utils`                                 |
| Themer     | `stores`     | `config`, `selectors`, `types`, `utils`                    |
| Themer     | `hooks`      | `config`, `selectors`, `stores`, `types`, `utils`          |
| Themer     | `api`        | `types`, `utils`                                           |
| Themer     | `components` | `config`, `hooks`, `selectors`, `stores`, `types`, `utils` |
| Themer     | `next`       | `api`, `config`, `hooks`, and the `head-script` entry      |
| Playground | `lib`        | nothing                                                    |
| Playground | `components` | `lib`                                                      |
| Playground | `app`        | `components`, `lib`                                        |

The tables record the imports as they were on the day of the decision: no code moved to fit them. The ESLint configs hold the rule; this table is its record.

## Consequences

- No layer imports the Themer's entries (`index`, `loader`, `head-script`), except the Next Adapter, which embeds the head script. The entries' own isolation (which chunks they share, what they may import from `node_modules`) stays with `check-entries`.
- Test files are exempt: a count test next to its owner module mounts the whole Themer.
- An import is matched by its specifier (`../stores/…`, `@/components/…`), not resolved. A layer reached through an unusual path (a new alias, a re-export from an allowed layer) is not caught.
- The rule checks direction between layers, not cycles inside one. The Themer had one cycle, between two type modules, removed in the same change; nothing checks that none comes back.
- Moving a module to another layer, or letting a layer import a new one, is an edit to the table in the workspace's ESLint config and to this record.

## Considered Options

- A resolving import checker (`eslint-plugin-import`, `dependency-cruiser`): rejected for now. It would also catch cycles and re-exports, at the price of a new dependency and a second run over every file, for a tree whose layers are flat directories that specifiers identify.
- A repo test that walks the import graph with the TypeScript compiler: rejected as a second checker to maintain beside the linter.
- Splitting the Themer's layers into workspace packages, so the package manager enforces them: rejected. The Themer ships as one package, and its entries' chunk sharing is already checked.
