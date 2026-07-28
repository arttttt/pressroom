/**
 * The `---` block Obsidian puts at the top of a note.
 *
 * This reads the flat `key: value` lines that the vault's own notes use, and
 * nothing else — no nested maps, no lists, no multi-line scalars. A real YAML
 * parser would be a dependency carried for a handful of fields that are always
 * one line. If the format ever grows past that, this is the place that must
 * change rather than the callers.
 */
export interface Frontmatter {
	readonly fields: ReadonlyMap<string, string>;
	/** Everything after the closing `---`, or the whole text if there was none. */
	readonly body: string;
}

import { normalise } from "./text.js";

const DELIMITER = "---";

export function splitFrontmatter(text: string): Frontmatter {
	// Normalised before anything looks at a line, and the body handed on is the
	// normalised one. It used to strip carriage returns only on the path where
	// frontmatter was found, so a note without any came back untouched and
	// every pattern below it silently stopped matching.
	const normalised = normalise(text);
	const lines = normalised.split("\n");
	if (lines[0] !== DELIMITER) return { fields: new Map(), body: normalised };

	const closing = lines.indexOf(DELIMITER, 1);
	// An unterminated block is not frontmatter; treat the text as it reads.
	if (closing === -1) return { fields: new Map(), body: normalised };

	const fields = new Map<string, string>();
	for (const line of lines.slice(1, closing)) {
		const separator = line.indexOf(":");
		if (separator === -1) continue;
		const key = line.slice(0, separator).trim();
		if (key.length === 0) continue;
		fields.set(key, stripQuotes(line.slice(separator + 1).trim()));
	}

	return { fields, body: lines.slice(closing + 1).join("\n") };
}

function stripQuotes(value: string): string {
	const quoted =
		(value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
	return quoted && value.length >= 2 ? value.slice(1, -1) : value;
}
