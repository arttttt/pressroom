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

Skeleton. The design lives in the `pressroom` project in mnemo; `docs/` carries
the parts that belong in the repository.

## Requirements

macOS only. Node 24+, pnpm. The Bitwarden CLI (`bw`) for credentials, and
Obsidian with the Local REST API plugin enabled — the vault is reached through
it rather than through the filesystem, so that Obsidian remains the only writer
of its own files.
