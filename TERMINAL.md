# Terminal


## Layout

```
src/lib/terminal/          terminal logic (pure, no React)
  state.ts                 the reducer: every state transition
  commands.ts              command registry, completion
  dirs.ts                  directories and path resolution
  location.ts              working directory and tree view transitions
  graph-command.ts         the `graph` command
  graph-output.ts          graph node > inspect output
  parse.ts                 tokenising, applying completions
  resolve.ts               page lookup and ranking for arguments
  mode.ts                  surface helpers (draft, output, dismiss)
  history.ts               history cursor and sessionStorage
  output.ts                output constructors
  search.ts                client search request and hit grouping
  search-server.ts         search results > terminal hits (API route)
  types.ts

src/lib/course/catalog.ts  page catalog types and URL lookup
src/lib/course/client.ts   catalogResource: loads /catalog.json once
src/lib/course/routes.ts   render-time routes: page URLs and kind views
src/lib/site/corpus.ts     builds the catalog and routes from the corpus

src/components/terminal/   terminal UI
  provider.tsx             owns the state; contexts, window listeners
  keys.ts                  prompt and window keys > actions
  run.ts                   runs a line: history, abort, result

src/components/sidebar/    terminal screen

src/lib/client/keybinds.ts every site wide hotkey
src/app/api/search/route.ts search endpoint (`format=terminal`)
```

`src/app/(docs)/layout.tsx` mounts `CourseRoutesProvider` › `GraphProvider` ›
`TerminalProvider` › `VirtualDocsLayout`. The terminal sits above the Fumadocs
layout, so it can serve the graph and the page, while the sidebar lives inside
the layout.

The terminal works from two sources of course data (see COMPILE.md §10):

- **`useCourseRoutes()`**: page URLs and kind views, available at render.
  Enough for the current page (`routes.match`), sidebar sections
  (`routes.subdirectories`) and kind-view tree entries.
- **The catalog**: titles, descriptions and aliases, which commands and
  completions need. `TerminalProvider` loads it with
  `useResource(catalogResource)` after the page renders. Completions stay
  empty until it arrives; `run.ts` awaits `catalogResource.load()` before
  executing and prints an error if it can't load. The resource is a shared
  store, so a load started by `run.ts` also enables completions. Offline it comes from the
  service worker (see PWA.md).

## Commands

| Command | Does |
|---|---|
| `cd [dir\|..\|~]` | Changes the working directory; the tree follows. No argument or `~` returns to the root |
| `ls [dir]` | Shows a directory in the tree until the prompt is focused again |
| `open <page\|dir>` | Navigates to a page (a directory opens its index) and closes the drawer |
| `switch <root>`, `checkout` | Moves to another root (`core`, `algebra`, `calculus`) |
| `pwd` | Prints the working directory |
| `md <page\|.>` | Shows the page's Markdown source |
| `gpt`, `claude`, `cursor [explain\|proof\|quiz\|check] <page\|.>` | Opens the page in that assistant with that prompt (default `explain`); Tab offers the intents first |
| `graph <depth\|strand\|focus\|find\|immerse\|collapse\|reset>` | Drives the course graph |
| `help` | Lists commands |
| `clear` | Clears output |
| anything else | Full-text search; matching pages replace the tree |

For `md` and the assistants, `.` means the current page. Page arguments
resolve by URL, title or alias (`resolve.ts`); ambiguous matches print a pick
list. `open` tries the working directory first.

Each command is a `CommandDescriptor`: `names`, `execute`, optional
`complete` and `usage`. The registry is built once when `commands.ts` loads.
The search descriptor has no names and is the registry's fallback, so every
non-blank line has a command. `execute` returns a `CommandResult` (output,
plus optional `navigate`, `closeDrawer`, `cwd`, `view` and `announce`) or a
promise of one; async commands show their `loading` message first, and the
next command aborts them. A result that arrives after its signal was aborted
is dropped, so commands need not check for aborts themselves. `cwd` and
`view` patch the location: an omitted field is left alone
(`applyCommandLocation`).

## State

All terminal state is one `TerminalState`, changed only by
`terminalReducer` (`state.ts`) through `useReducer` in the provider:

| Field | Holds |
|---|---|
| `surface` | `TerminalSurface` (`mode.ts`): what the prompt and output pane show |
| `location` | `TerminalLocation` (see [Directories](#directories)): what the tree shows |
| `history` | entries and the ↑/↓ cursor |
| `cycle` | the completion list frozen while Tab/↑/↓ cycle it, and the selected index |
| `pendingNavigation` | where the shown command navigated to |
| `route` | the route the state last followed |
| `hadOutput` | whether output has ever shown (`data-terminal-had-output`) |

The reducer is pure: side effects (focus, `router.push`, aborts, the live
region) stay in the provider, `keys.ts` and `run.ts`. Key handlers read the
state snapshot to decide (for example whether Esc is consumed) and dispatch
actions for every change. Window listeners subscribe once and read live
state through `useEffectEvent`, so nothing mirrors state into refs.

| mode | means | sidebar shows |
|---|---|---|
| `browse` | prompt empty | tree |
| `edit` | reader is typing; completions may be open | tree |
| `output` | a command printed something | output |

The reducer builds surfaces with `draftSurface`, `showOutput`, `leaveOutput`
and `dismissLayer`. Escape peels one layer at a time: completions, then
output, then edit mode (the draft text stays), then focus.

Editing the draft (typing, pasting, walking history) drops `cycle`, so the
next Tab completes the new text.

Navigating clears the surface, unless the navigation came from the command
being shown (`pendingNavigation`), so `open` can print its result on the new
page.

History keeps the last 50 commands in `sessionStorage`
(`math1251-terminal-history`), so it lasts as long as the tab. ↑/↓ on an empty prompt walk it; with text,
they cycle completions (at most 8).

## Directories

Commands derive directories from the catalog (`dirs.ts`): every ancestor of a
note page. The sidebar, which renders before the catalog loads, gets the same
structure from `routes.subdirectories`. There are two levels: **roots** (`/core`, `/algebra`,
`/calculus`, the Fumadocs tabs) and the **chapters** inside them. Kind-view
pages are not directories.

`TerminalLocation` holds:

- `cwd`: the working directory. The tree shows it and the prompt shows its
  name (`[eigenvalues/ …]`). It starts at the current page's root, or at
  the home root on a page outside the course (such as `/~offline`).
- `view`: what the tree shows instead, a `TreeView`:
  - `list`: a directory from `ls`. Cleared whenever `cwd` changes or the
    route does.
  - `search`: the pages a search matched. Global, so it is kept across
    navigation and `switch` while the reader steps through results.

  Either is cleared by focusing the prompt, Esc (once nothing else is left
  to dismiss), `clear`, `cd` or `ls`. `moveTo` in `location.ts` is the one rule
  for what survives a move, shared by commands and route changes.

Roots are separate trees. `cd` resolves paths (`../vector-spaces`, slugs or
titles) within the current root and stops at its top; other roots are only
reachable with `switch`. Opening a page inside `cwd` keeps it; opening one
outside resets `cwd` to that page's root (`followRoute`). Pages outside the
course leave `cwd` alone, so the tree and the root selector (`tabs.tsx`, which
follows `cwd` rather than the URL) never lose their place.

## Search

A search that matches pages sets a `search` view; one that matches nothing
in the tree falls back to the output pane.

- **Tree:** `SidebarSearchTree` prunes the full page tree (all roots) to the
  matching pages, in tree order, with folders forced open. Focus lands on
  the best match.
- **Preview:** `SearchPreview` sits under the tree and shows the hits of the
  result row last focused or hovered, with highlighted snippets and links to
  each section. One delegated `pointerover`/`focusin` listener on the pane
  picks the row, so moving between rows re-renders only the preview.
- **Page:** `SearchHighlight` marks the query terms in `[data-graph-prose]`
  with the CSS Custom Highlight API: no DOM changes, cleared with the view.
  Its `::highlight()` rule is rendered inline because the CSS pipeline does
  not parse it yet.

`searchResults()` (`search.ts`) groups hits by page, best match first;
kind-view hits count towards their parent page.

## Contexts

`TerminalProvider` exposes three contexts, split by how often they change,
so typing re-renders only the prompt:

| Hook | Changes | Holds | Used by |
|---|---|---|---|
| `useTerminalApi()` | never | `focusPrompt`, `publishOutput`, `clearInspectOutput`, `showTree`, `changeDirectory`, `bindSidebar`, `inputRef`, `outputRef` | sidebar, tree, launchers, graph |
| `useTerminalScreen()` | when output or the directory changes | `pane`, `output`, `echo`, `hadOutput`, `cwd`, `view` | sidebar, panes, tree, prompt, output pane |
| `useTerminal()` | every keystroke | everything above, plus surface, completions, history focus | `TerminalPrompt` only |

Keep new consumers on the narrowest hook. Subscribing the sidebar to
`useTerminal()` re-renders the page tree on every keystroke.

## Sidebar

The terminal sits above the Fumadocs layout, so it cannot call `useSidebar()`.
Instead the sidebar registers controls on mount:

```ts
bindSidebar({ reveal, closeDrawer })
```

`focusPrompt({ expand: true })` calls `reveal()`, which un-collapses the
desktop sidebar or opens the drawer, then focuses the input itself. The
section hotkeys reuse the same `reveal()`. Commands that return
`closeDrawer` call `closeDrawer()`.

`panes.tsx` renders the tree and the output pane stacked; the hidden one is
`inert`. `data-terminal-pane-target` and `data-terminal-had-output` drive the
cross-fade in `global.css`.

The tree (`tree.tsx`) renders the current root's Fumadocs page tree itself,
starting from the `ls` directory or `cwd`: a chapter shows its index page and pages,
led by a `..` row that moves up a directory. `ls` moves focus to the first
row; scrolling resets when the directory changes. `PersistentFolder` keeps
open state across routes (`tree-state.tsx`) and, when collapsed but
holding the current page, folds to just the active chain
(`[data-tree-pinned]`). One `useRailMarks` pass per tree positions the
current-page bar on every rail.

`SidebarPanes` appears in both the desktop aside and the mobile drawer, but
Fumadocs mounts only the shell for the current `mode`, so there is one tree
and one output pane at a time.

Rows that the digit hotkeys target carry `[data-tree-section]`, set at
render: in a directory listing, its subdirectories (`routes.subdirectories`), or
every entry when it has none; in a search, the first result of each group.

## Keys

Global keys live in `src/lib/client/keybinds.ts`. The sets do not overlap, so
each feature keeps its own window listener and ordering never matters.

| Key | Owner | Scope | Does |
|---|---|---|---|
| `/` | terminal | anywhere outside a text field | Focus the prompt |
| ⌘K / Ctrl+K | terminal | anywhere except other text fields | Focus the prompt |
| `1`–`9`, `0` | sidebar | anywhere outside a text field | Leave output, reveal the sidebar, focus that top-level section (in a chapter: that page) |
| Esc | terminal | prompt unfocused, something to dismiss | Dismiss one layer |
| Esc | graph | graph engaged (capture phase) | Graph's own escape |
| printable keys, ↑/↓, paste | terminal | output showing, no text selected | Continue in the prompt (digits excluded) |
| ↑↓←→ / WASD | tree | a tree row focused | Move; ←/→ fold and unfold |
| Space | tree | a link row focused | Open |
| Esc | tree | a tree row focused | Leave the tree |

In the prompt: Tab and ↑/↓ cycle completions, Enter runs (accepting the
highlighted completion), Esc dismisses.

Tree navigation is deliberately focus-scoped: global arrows would take over
page scrolling.

## Performance

- Two window `keydown` listeners (terminal, sidebar), each subscribed once;
  the terminal's reads live state through `useEffectEvent`. Non-matching
  keys return after a few comparisons.
- Section hotkeys only touch the DOM on a digit press.
- The directory index is built once per catalog (`WeakMap`); the tree's
  scoped nodes are memoised on root and directory.
- The catalog is fetched once per page load (`jsonResource`) rather than
  embedded in every page; the routes index is built once in
  `CourseRoutesProvider`.
- Contexts are split so keystrokes re-render the prompt alone (see above).
- Completions are memoised on the parsed line and frozen while cycling.
- Search is server-side (`/api/search?format=terminal`, at most 24 hits);
  each new command aborts the previous request.
- Rail marks read all rows before writing any, and re-run only on route or
  size changes.

## Adding a command

1. Write a `CommandDescriptor` (see `command()` in `commands.ts`).
2. Add it to `coreDescriptors()`, which is the whole registry (`help` lists
   it too); `createRegistry` throws on duplicate names or a missing search
   fallback.
3. Return output through the constructors in `output.ts`. A new output
   kind needs a type in `types.ts`, a case in `OutputBody`, and a line in
   `announce()`.
4. `command()` sets `advertised: true`, which lists it in `help` and
   command completion; set it to `false` to hide it.

## Adding a hotkey

Add a matcher to `keybinds.ts`, check it does not overlap an existing set,
and listen from the component that owns the behaviour. If it must share a
key, exclude it explicitly in the other owner, as the terminal does for
digits.
