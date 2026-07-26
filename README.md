# Pressroom

A macOS desktop application for publishing long-form technical articles from an
Obsidian vault to several platforms, semi-automatically.

Writing happens in Obsidian: one folder per article, one file per section, one
subfolder per language. Publishing does not, and it is the part that costs time
— each platform wants the whole article as a single document, in its own
dialect, pasted into its own editor, behind its own login. Pressroom does the
mechanical half of that and leaves the judgement to a person.

## What it does

- **Assembles** an article from its section files into one document per language.
- **Renders** that document into each platform's flavour of markup.
- **Opens** the platform's editor in a real, logged-in browser view, with the
  content already in place, and stops before anything is published.
- **Records** where each article went, in which language, under which URL, and
  which of them is canonical.
- **Collects** what can be collected: score and comments from Hacker News and
  Reddit. The rest is entered by hand or not at all.

Publication is always finished by a person pressing the button. Nothing here
submits anything on its own.

## Targets

| platform | how it publishes | what is automated |
|---|---|---|
| Reddit | API | the whole submission, and metrics |
| Hacker News | submission form | URL and title prefilled; metrics read via API |
| Habr | web editor | text, title, hubs, tags prefilled |
| HackerNoon | web editor | text and canonical URL prefilled |
| Hackaday | an email to the editors | a drafted tip, sent by hand |

## Status

It reads the vault and assembles articles; it publishes nothing yet. The window
lists what is in the vault, and opening an article joins its section files into
one Markdown document ready to be copied. Rendering per platform, the browser
views, the registry and the metrics are all still to come. The design lives in
the `pressroom` project in mnemo; `docs/` carries the parts that belong in the
repository.

Articles must be written in sections — one folder per article, one file per
section, an index note naming them in order. Articles written as a single note
are listed but refused, with a message saying so.

## Running it

```sh
pnpm install
pnpm dev
```

On first run, open **Settings** and paste the key from Obsidian's Local REST API
plugin. It is stored encrypted with a key held in the macOS Keychain, and never
read back into the window. `Save and check` reports whether the vault answered.

The rest:

| command | what it does |
|---|---|
| `pnpm build` | builds main, preload and renderer into `out/` |
| `pnpm start` | runs the built application, without the dev server |
| `pnpm typecheck` | checks both halves — the Node side and the renderer |
| `pnpm test` | runs the unit tests |

Electron downloads its own binary the first time it is needed, so the first
`pnpm dev` takes noticeably longer than the ones after it.

## Requirements

macOS only. Node 24+, pnpm — that is everything the shell needs. The Bitwarden
CLI (`bw`) and Obsidian with the Local REST API plugin are requirements of the
features rather than of the application starting: the vault is reached through
the plugin rather than through the filesystem, so that Obsidian remains the only
writer of its own files.
