# Changelog

What each installed build differs by. A version is bumped whenever something
is fixed or added that a person using the application would notice — the copy
in `/Applications` cannot be diffed against the checkout, so this is how the
two are told apart.

Patch for a fix, minor for something new, while the first digit stays 0.

## 0.2.0

Everything a deep review turned up. Four of these could corrupt or lose work
and none of them were visible without tracing the code.

- **Choosing another destination with the "Mark published" form open kept the
  address typed for the first one**, and recording wrote it against the second
  — where every announcement then pointed.
- **Any failed read of `published.md` erased the whole record.** The note is
  rewritten in full from what reading understood, and reading turned every
  error into "this article has been published nowhere". One 500 from the plugin
  replaced four publications with one. Rows Pressroom cannot read — a platform
  it does not know, a row corrected by hand — were deleted the same way, and
  are now carried through untouched.
- **A note saved on Windows had its code blocks rewritten.** Carriage returns
  defeated fence detection outright, so `# ` inside a shell snippet became a
  heading. The same characters lost a section's heading, after which the
  article took that section's name from the file name.
- **Canonical went to whichever place was recorded first**, which is usually an
  announcement — so a Reddit thread became the article's canonical address and
  landed in HackerNoon's "First Seen At", which cannot be corrected once the
  story is out. Only a platform carrying the article can hold it now.
- A wikilink carrying a path — which Obsidian writes on its own — broke the
  whole article. Underlined headings are demoted and capped like any other. An
  index that documents its own format no longer invents a section.
- Recording and forgetting say when they fail instead of doing nothing in
  silence; an article with no language folder shows its destinations instead of
  an empty page; a window left open past midnight can still record today.
- Links only leave by `http`, `https` and `mailto`. The vault must be on this
  machine. Requests time out. Settings are written atomically.

## 0.1.0

- Pressroom keeps up with the vault while you write in it. A section added to
  a translation, or a whole language folder appearing, shows up within ten
  seconds instead of waiting for the screen to be reopened — and at once when
  the window comes back to the front.
- It only asks while the window is on screen; behind another window or
  minimised, it asks nothing.
- What a platform will receive is prepared again when the text behind it
  changes, so the panel cannot show a paragraph that has been rewritten.

## 0.0.3

- A destination an article has already gone to is green in the list. It was
  blue with a faint halo, which on a near-black ground is blue — every
  destination looked alike whether it had been published or not.
- Record and Cancel line up with the fields they belong to. A margin meant for
  the destination's own row of actions was reaching into the recording form and
  lifting them clear of it.
- Habr no longer shows Hubs and Tags reading "chosen when publishing" on every
  article. They appear when there is something to put in them.

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
