# Terminal

The sidebar is a terminal. A prompt at the top takes commands (`cd`, `ls`,
`open`, `switch`, `md`, `claude explain .`, `relations`, …) and treats
anything else as a full-text search. Below it, one pane shows either the page
tree of the working directory or the output of the last command. The tree is
not a separate widget that happens to sit next to the prompt: it *is* the
terminal's working directory (`cd` changes it, `ls` lists into it, a search
replaces it with the matching pages), so the sidebar and the terminal are one
module.

Everything is keyboard-reachable: `/` or ⌘K focuses the prompt, digits jump to
sections, arrows and WASD walk the tree, Esc peels back one layer at a time.

The logic is pure and lives in `lib/terminal` (a reducer, commands, path
resolution, search projection); the UI is `components/terminal` (provider,
prompt, output, keys) and `components/sidebar` (the shell, tree, tabs, search
tree). `lib/terminal` sits above `course`, `export` and `relations` and below
`site`; it reads the page catalog and route index from COMPILE.md, the reading
dock from RELATIONS.md and prompt intents from EXPORT.md.

## Layout

```
src/lib/terminal/              logic (no React)
  state.ts                     terminalReducer: every state transition
  commands.ts                  command registry, execution, completion
  dirs.ts                      directories, roots and path resolution
  location.ts                  working directory and tree view transitions
  resolve.ts                   page lookup and ranking for arguments
  parse.ts                     tokenising, applying completions
  mode.ts                      surfaces: draft, output, dismiss
  history.ts                   history cursor and sessionStorage
  output.ts                    output constructors
  relations-command.ts         the `relations` command
  search.ts                    client search request, hit grouping
  search-server.ts             search results → terminal hits (server)
  types.ts                     state, command and output types; limits
src/components/terminal/
  provider.tsx                 TerminalProvider: state, contexts, window keys
  prompt.tsx                   TerminalPrompt, TerminalLauncher, completions
  output.tsx                   the output pane: one renderer per output kind
  keys.ts                      prompt and window keys → actions
  run.ts                       runs a line: history, catalog, abort, result
  highlight.tsx                SearchHighlight: marks search terms in the page
src/components/sidebar/
  sidebar.tsx                  Sidebar: desktop aside and mobile drawer; binds the terminal; section hotkeys
  panes.tsx                    SidebarPanes: tree and output stacked, cross-faded
  tree.tsx                     the directory tree of cwd or an `ls` view
  search-tree.tsx              SidebarSearchTree: the page tree pruned to search hits
  search-preview.tsx           SearchPreview: hits of the focused result row
  tabs.tsx                     SidebarTabs: the root selector
  rows.tsx                     TreeRow, TreeSeparator; offline greying
  tree-state.tsx               folder open state and scroll across routes
  tree-keys.ts                 tree keyboard model and DOM selectors (TREE)
  rail-marks.ts                useRailMarks: the current-page bar on each rail
  labels.tsx                   withMarkdownTreeLabels: Markdown in tree labels (server)
  page-tree.ts                 buildSidebarTree: the labelled page tree (server, cached)
src/lib/client/keybinds.ts     every site-wide hotkey; moveKey, cursorKey, stepWithin
src/app/api/search/route.ts    search endpoint
```

`app/(docs)/layout.tsx` mounts `CourseRoutesProvider` › `RelationsProvider` ›
`TerminalProvider` › `VirtualDocsLayout`. The terminal sits above the Fumadocs
layout, so it can read the course routes and the page's relations; the sidebar
lives inside the layout (SITE.md shows how it is mounted).

## Course data

The terminal works from two sources (COMPILE.md, Client data):

- **`useCourseRoutes()`**: page URLs and kind views, available at first render.
  Enough for the current page (`routes.match`), sidebar sections
  (`routes.subdirectories`) and kind-view entries.
- **The catalog**: titles, descriptions, aliases and prompt targets, which
  commands and completions need. `TerminalProvider` loads it with
  `useResource(catalogResource)` after the page renders. Completions stay
  empty until it arrives; `run.ts` awaits `catalogResource.load()` before
  executing and prints an error if it can't load. The resource is a shared
  store, so a load started by `run.ts` also enables completions. Offline it
  comes from the service worker (PWA.md).

## Commands

| Command | Does |
|---|---|
| `cd [dir\|..\|~]` | changes the working directory; the tree follows. No argument or `~` returns to the root |
| `ls [dir]` | shows a directory in the tree until the prompt is focused again |
| `open <page\|dir>` | navigates to a page (a directory opens its index) and closes the drawer |
| `switch <root>`, `checkout` | moves to another root (a strand: `core`, `algebra`, `calculus`) |
| `pwd` | prints the working directory |
| `md <page\|.>` | shows the page's Markdown export |
| `gpt`/`chatgpt`, `claude`, `cursor [intent] <page\|.>` | opens the page in that assistant with that intent (default `explain`); Tab offers the intents first |
| `relations` | lists what the current page builds on and leads to, and the threads through it |
| `help` | lists commands |
| `clear` | clears output and any tree view |
| anything else | full-text search; matching pages replace the tree |

For `md` and the assistants, `.` means the current page. Page arguments resolve
by URL, title or alias (`resolve.ts`), ranked; ambiguous matches print a pick
list. `open` tries the working directory first.

The intent words come from `intentWord` (`explain`, `quiz`, `check`, and the
pack's derivation word, `proof` for math) and are parsed back by
`intentFromWord`; an intent the page doesn't offer is rejected with the ones it
does. What each intent does is EXPORT.md's; `relations` renders data from
RELATIONS.md.

Each command is a `CommandDescriptor`: `names`, `execute`, `usage`,
`advertised`, and optional `complete` and `loading`. The registry
(`coreDescriptors`) is built once when `commands.ts` loads; `createRegistry`
throws on a duplicate name or a missing search fallback. The search descriptor
has no names and is the fallback, so every non-blank line has a command.

`execute` returns a `CommandResult` (output, plus optional `navigate`,
`closeDrawer`, `cwd`, `view` and `announce`) or a promise of one. Async commands
show their `loading` message first, and the next command aborts them; a result
that arrives after its signal was aborted is dropped, so commands needn't check
for aborts. `cwd` and `view` patch the location: an omitted field is left alone
(`applyCommandLocation`). `announce` goes to a live region for screen readers.

## State

All terminal state is one `TerminalState`, changed only by `terminalReducer`
(`state.ts`) through `useReducer` in the provider:

| Field | Holds |
|---|---|
| `surface` | `TerminalSurface` (`mode.ts`): what the prompt and output pane show |
| `location` | `TerminalLocation` (below): what the tree shows |
| `history` | entries and the ↑/↓ cursor |
| `cycle` | the completion list frozen while Tab/↑/↓ cycle it, and the selected index |
| `pendingNavigation` | where the command being shown navigated to |
| `route` | the route the state last followed |
| `hadOutput` | whether output has ever shown (`data-terminal-had-output`) |

| Mode | Means | The pane shows |
|---|---|---|
| `browse` | prompt empty, or its draft set aside by Esc | tree |
| `edit` | the reader is typing; completions may be open | tree |
| `output` | a command printed something | output |

The reducer builds surfaces with `draftSurface`, `showOutput`, `leaveOutput`
and `dismissLayer`. Escape peels one layer at a time: completions, then
output, then edit mode (the draft stays), then focus. Editing the draft
(typing, pasting, walking history) drops `cycle`, so the next Tab completes
the new text. Navigating clears the surface unless the navigation came from the
command being shown (`pendingNavigation`), so `open` can print its result on
the new page.

History keeps the last 50 commands in `sessionStorage` under
`<course code, lower-cased>-terminal-history`, so it lasts as long as the tab.
↑/↓ on an empty prompt walk it; with text, they cycle completions (at most 8).

## Directories

Directories come from the catalog (`dirs.ts`): every ancestor of a notes page.
The sidebar, which renders before the catalog loads, gets the same structure
from `routes.subdirectories`. There are two levels: **roots** (the strands,
which are also the Fumadocs tabs) and the **chapters** inside them. Kind views
are not directories.

`TerminalLocation` holds:

- `cwd`: the working directory. The tree shows it and the prompt shows its name
  (`[eigenvalues/ …]`). It starts at the current page's root, or at the home
  root on a page outside the course (such as `/~offline`).
- `view`: what the tree shows instead, a `TreeView`:
  - `list`: a directory from `ls`, cleared whenever `cwd` changes or the route
    moves within the course;
  - `search`: the pages a search matched; kept across navigation and `switch`
    while the reader steps through results.

  Either is cleared by focusing the prompt, Esc (once nothing else is left to
  dismiss), `clear`, `cd` or `ls`. `moveTo` (`location.ts`) is the one rule for
  what survives a move, shared by commands and route changes.

Roots are separate trees. `cd` resolves paths (`../vector-spaces`, slugs or
titles) within the current root and stops at its top; other roots are reached
with `switch`. Opening a page inside `cwd` keeps it; opening one outside resets
`cwd` to that page's root (`followRoute`). Pages outside the course leave `cwd`
alone, so the tree and the root selector never lose their place (the offline
page sets it explicitly, to the root of the page that failed to load).

## Search

A line that isn't a command is sent to `/api/search?format=terminal`. The
route uses Fumadocs' Orama index built from the loader's structured data
(`createFromSource(source)`), asks for at most 24 results, and projects them in
`search-server.ts`: titles and snippets as Markdown fragments with the query
highlighted (MARKDOWN.md); page and heading hits are titled by their own text,
body-text hits by their page. Requests without
`format=terminal` get Fumadocs' default response; the Fumadocs search dialog is
disabled (`RootProvider search={{ enabled: false }}`), so the terminal is the
only search UI.

`searchResults()` (`search.ts`) groups hits by page, best match first; kind-view
hits count towards their parent page. A search that matches pages sets a
`search` view; one that matches nothing falls back to the output pane.

- **Tree:** `SidebarSearchTree` prunes the full page tree (all roots) to the
  matching pages, in tree order, drawn as an always-open outline with guide
  lines (a folder with a single match merges into that row's label). Focus
  lands on the best match.
- **Preview:** `SearchPreview` sits under the tree and shows the hits of the
  row last focused or hovered, with highlighted snippets and links to each
  section. Delegated `pointerover` and `focusin` listeners on the pane pick the
  row, so moving between rows re-renders only the preview.
- **Page:** `SearchHighlight` marks the query terms in `[data-prose]` with the
  CSS Custom Highlight API: no DOM changes, cleared with the view. It skips
  `.katex-mathml`, `script` and `style`. Its `::highlight()` rule is rendered
  inline because the CSS pipeline doesn't parse it yet.

## The sidebar

`Sidebar` (`sidebar.tsx`) replaces the Fumadocs sidebar slot. It renders the
desktop aside (with the collapse trigger and, when collapsed, a
`TerminalLauncher` instead of the prompt) and the mobile drawer, each holding
`TerminalPrompt` above `SidebarPanes`. Fumadocs mounts only the shell for the
current mode, so there is one tree and one output pane at a time.

**Binding.** The terminal sits above the layout and can't call `useSidebar()`,
so the sidebar registers controls on mount:

```ts
bindSidebar({ reveal, closeDrawer })
```

`focusPrompt({ expand: true })` calls `reveal()`, which un-collapses the desktop
sidebar or opens the drawer, then focuses the input. The section hotkeys use the
same `reveal()`; commands that return `closeDrawer` call `closeDrawer()`.

**Panes.** `panes.tsx` stacks the tree and the output pane; the hidden one is
`inert`. `data-terminal-pane-target` and `data-terminal-had-output` drive the
cross-fade in `global.css`.

**Tree.** `tree.tsx` renders the current root's Fumadocs page tree itself,
starting from the `ls` directory or `cwd`: a chapter shows its index page and
pages, led by a `..` row that moves up a directory. `ls` moves focus to the
first row; scrolling resets when the directory changes. Folders keep their
open state across routes (`tree-state.tsx`), and a collapsed folder holding the
current page folds to just the active chain (`[data-tree-pinned]`). Kind views
appear only while one is open, under their page (MDX-ENV.md, Kind views).

**Rows.** `TreeRow` renders links, buttons and headers with the active marker
(`>` and a hatched background). While offline, a link row whose page isn't
saved is `aria-disabled`, titled "Not saved for offline reading", and cancels
navigation (`useUnsaved`, PWA.md).

**Root selector.** `SidebarTabs` follows `cwd`, not the URL. Picking an unsaved
root while offline changes directory instead of navigating, so its saved pages
stay browsable.

**Rail marks.** One `useRailMarks` pass per tree positions the current-page bar
on every rail: it reads all rows before writing any, re-places on route change
(sliding) and on list resize.

**Labels.** Page and folder names may contain Markdown and TeX.
`buildSidebarTree` (`page-tree.ts`, React-`cache`d) runs on the server and
renders every label to HTML once (`withMarkdownTreeLabels`); separators written
as `[NAME]` get bold brackets.

**Sections.** Rows the digit hotkeys target carry `[data-tree-section]`, set at
render: in a directory listing, its subdirectories (or every entry when there
are none); in a search, the first result of each group.

## Contexts

`TerminalProvider` exposes three contexts, split by how often they change, so
typing re-renders only the prompt:

| Hook | Changes | Holds | Used by |
|---|---|---|---|
| `useTerminalApi()` | never | `focusPrompt`, `publishOutput`, `showTree`, `changeDirectory`, `bindSidebar`, `inputRef`, `outputRef` | sidebar, tree, tabs, launchers, output pane, offline page |
| `useTerminalScreen()` | when output or the directory changes | `pane`, `output`, `echo`, `hadOutput`, `cwd`, `view` | sidebar, panes (which pass the tree its directory), output pane, prompt (`cwd`) |
| `useTerminal()` | every keystroke | the API, plus the surface, completions, the selected completion, the focus epoch and the prompt's key handler | `TerminalPrompt` only |

## Keys

Global keys live in `lib/client/keybinds.ts`. The sets don't overlap, so each
feature keeps its own window listener and ordering never matters.

| Key | Owner | Scope | Does |
|---|---|---|---|
| `/` | terminal | anywhere outside a text field | focus the prompt |
| ⌘K / Ctrl+K | terminal | anywhere except other text fields | focus the prompt |
| `1`–`9`, `0` | sidebar | anywhere outside a text field | leave output, reveal the sidebar, focus that section |
| Esc | terminal | prompt unfocused, something to dismiss | dismiss one layer |
| printable keys, ↑/↓, paste | terminal | output showing, no text selected | continue in the prompt (digits excluded) |
| ↑↓←→ / WASD | tree | a tree row focused | move; ←/→ fold and unfold |
| Space | tree | a link row focused | open |
| Esc | tree | a tree row focused | leave the tree |
| Esc | reading dock | bay open (capture phase) | close the bay |
| ←→ / AD, Home/End, Enter; ↑↓ / WS | dock route strips | a strip focused | move along a thread, open a stop, move between strips (RELATIONS.md) |
| arrows / WASD, Space; ←→ / AD, Home/End, Enter; Esc | threads page | index or diagram focused | move, show or hide threads, open stops (RELATIONS.md) |

In the prompt: Tab (Shift+Tab backwards) and ↑/↓ cycle completions (↑/↓ walk
history instead on an empty prompt), Enter runs (accepting the highlighted
completion), Esc dismisses.

Arrow navigation is focus-scoped: each widget reads arrows and WASD through
`moveKey` (route strips and the diagram through `cursorKey`, which adds
Home/End), handles them in its own `onKeyDown` and calls `preventDefault`,
which the terminal's and sidebar's window listeners check first, so a handled
key never reaches them.

## Design decisions

**1. The sidebar is the terminal's screen.** One working directory drives the
prompt, the tree and the root selector, so typing `cd ../eigenvalues` and
clicking a folder are the same operation, and search results, listings and
command output share one pane. The cost is coupling: the sidebar imports the
terminal's provider and directory model, and the two can't be changed
independently.

**2. The logic is a pure reducer.** Every transition goes through
`terminalReducer`; side effects (focus, `router.push`, aborts, the live region)
stay in the provider, `keys.ts` and `run.ts`. Key handlers read a state
snapshot to decide (for example whether Esc is consumed) and dispatch actions.
The terminal's window listeners subscribe once and read live state through
`useEffectEvent`, so nothing mirrors terminal state into refs.

**3. Three contexts, split by change rate.** A keystroke re-renders the prompt
and nothing else; the page tree, which is the most expensive part of the
sidebar, re-renders only when the directory or output changes. New consumers
must use the narrowest hook: subscribing the tree to `useTerminal()` would
re-render it on every key.

**4. Two data sources, by when they're needed.** The tree must render on the
first paint, so it works from the small `routes` index; commands need titles
and aliases, which wait for the catalog. Nothing in the first render depends on
the 291 KB catalog.

**5. Every line is a command.** Search is the registry's fallback, not a
special case in the parser, so typing a word and pressing Enter always does
something, and adding a command can't accidentally shadow search except by
name.

**6. Async results are dropped, not cancelled.** A new command aborts the
previous one's signal, and the runner drops any result whose signal was
aborted. Commands stay simple: none of them checks for cancellation.

**7. Roots are separate trees.** `cd` stops at the top of a strand; changing
strand is an explicit `switch`. Relative paths stay short and unambiguous
(chapter slugs repeat across strands), and the root selector always agrees with
the tree.

**8. Escape peels one layer.** Completions, output, edit mode and focus are
dismissed in that order, so Esc never throws away more than the reader expects
(a typed draft survives one press).

**9. Arrows are focus-scoped.** Global arrow handlers would take over page
scrolling. Only a focused widget reads arrows and WASD, and handled keys are
`preventDefault`ed so the global listeners ignore them.

**10. Tree labels are rendered on the server.** Labels may contain TeX;
rendering them in the browser would ship KaTeX. `buildSidebarTree` renders
them once per build, and the client tree receives HTML.

**11. Search highlighting doesn't touch the DOM.** The CSS Custom Highlight API
marks terms in the page without wrapping text in elements, so React's tree and
KaTeX's markup are left alone, and clearing it is one call.

**12. History lives in `sessionStorage`.** It survives reloads and navigation
within a tab, but not across tabs or sessions, which matches how a shell
history is used here and avoids a growing store. The key is derived from the
course code, so two courses on one origin don't share history.

## Performance

- Two window `keydown` listeners (terminal, sidebar), each subscribed once;
  non-matching keys return after a few comparisons. Section hotkeys touch the
  DOM only on a digit press.
- The directory index is built once per catalog (`WeakMap`); the tree's scoped
  nodes are memoised on root and directory.
- The catalog is fetched once per page load rather than embedded in every page;
  the routes index is built once in `CourseRoutesProvider`.
- Completions are memoised on the parsed line and frozen while cycling.
- Search runs on the server, returns at most 24 hits, and each new command
  aborts the previous request. The Orama index is built in memory on the
  search route's first request.
- Rail marks read all rows before writing any, and re-run only on route or size
  changes.
- Tree labels are rendered to HTML once on the server.

## Limitations

- Search needs the network; offline it reports that it can't run.
- The search index lives in the server process, so the first search after a cold
  start pays for building it.
- Commands can't be composed (no pipes, no arguments beyond an assistant's
  intent and one page or directory).
- Directories are derived from pages: an empty chapter folder doesn't exist for
  `cd`.
- History is per tab.

## Changing things

**A command:**

1. Write a `CommandDescriptor` (see `command()` in `commands.ts`).
2. Add it to `coreDescriptors()`, the whole registry (`help` lists it too).
3. Return output through the constructors in `output.ts`. A new output kind
   needs a type in `types.ts`, a case in `OutputBody` (`output.tsx`) and a line
   in `announce()`.
4. `command()` sets `advertised: true`, which lists it in `help` and command
   completion; set it to `false` to hide it.

**A hotkey:** add a matcher to `keybinds.ts`, check it doesn't overlap an
existing set, and listen from the component that owns the behaviour. If it must
share a key, exclude it explicitly in the other owner, as the terminal does for
digits.

**A sidebar row type:** render it through `TreeRow` so it gets the active
marker; link and button rows also get `data-tree-row` and so the tree's keyboard
model, and link rows get offline greying.

## Invariants

- State changes only through `terminalReducer`; the reducer has no side effects.
- The tree, the prompt and the root selector all follow `cwd`, never the URL
  directly.
- `useTerminal()` is used only by `TerminalPrompt`.
- Every non-blank line resolves to a command (search is the fallback).
- Hotkey sets don't overlap; a widget that handles a key calls
  `preventDefault`.
- Client components never import the Markdown renderer; tree labels arrive as
  HTML.
- Navigating to a page outside the course never moves `cwd` (only the offline
  page's explicit `changeDirectory` does).
