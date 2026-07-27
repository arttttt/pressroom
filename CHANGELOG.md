# Changelog

What each installed build differs by. A version is bumped whenever something
is fixed or added that a person using the application would notice — the copy
in `/Applications` cannot be diffed against the checkout, so this is how the
two are told apart.

Patch for a fix, minor for something new, while the first digit stays 0.

## 0.0.2

- HackerNoon receives the article as a document rather than as a wall of
  characters. Its editor sniffs pasted text to decide whether it is Markdown,
  and when it decided wrong the whole article arrived as one paragraph with
  every line break gone. The clipboard now carries the rendered HTML beside
  the source, and there is nothing left to sniff.
- The application says which build it is, on **The destinations** screen.

## 0.0.1

First build installed on a machine.

- The desk: what is ready to send, against where each article can still go.
- An article's text per language, and every destination showing exactly what
  that platform receives.
- All five renderers — Habr, HackerNoon, Reddit, Hacker News, Hackaday.
- Opens a platform in the browser already signed in to it, carrying what fits
  in an address and the rest on the clipboard.
- Records where an article went, in the vault beside it.
- **The destinations**: what each platform is and what catches people out.
