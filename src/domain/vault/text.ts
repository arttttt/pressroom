/**
 * A note as it comes out of the vault, made fit to be read line by line.
 *
 * Two things arrive with real files and with nothing a test happens to write,
 * which is why both went unnoticed until a review looked for them:
 *
 * **Carriage returns.** A note saved on Windows, or synced from one, ends its
 * lines `\r\n`. Splitting on `\n` then leaves a `\r` on every line, and a
 * pattern anchored with `$` matches none of them — `.` does not match `\r`
 * either, it being a line terminator. Fence detection therefore failed
 * completely, and `# ` inside a shell snippet was rewritten as a heading: the
 * exact corruption fence handling exists to prevent. A section's own heading
 * was lost the same way.
 *
 * **A byte-order mark.** An invisible character before the first `-` defeats
 * frontmatter detection and section-heading detection alike, so the article
 * silently took its title from the folder name.
 *
 * Both are properties of the file, not of its content, so they are removed
 * once here — where the vault's text enters the domain — rather than guarded
 * against by every pattern that reads a line.
 */
export function normalise(text: string): string {
	return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}
