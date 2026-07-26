import { anchorFor } from "./markdown.js";

/** A run of the source text, carrying the anchor its section is reached by. */
export interface SourcePart {
	/** Absent for anything before the first heading. */
	readonly id: string | null;
	readonly text: string;
}

/**
 * Cuts the source into the same sections the preview found, so the contents
 * reaches the same places in either view.
 *
 * It splits on the headings it was given rather than on anything that looks
 * like one, which keeps a `## ` inside a shell snippet from opening a section
 * that does not exist.
 *
 * The parts joined back together are the source unchanged — what is shown has
 * to stay the text that gets copied, or the two quietly disagree.
 */
export function splitSource(source: string, headings: readonly string[]): readonly SourcePart[] {
	const lines = source.split("\n");
	const parts: SourcePart[] = [];
	let current: string[] = [];
	let found = 0;

	const finish = (trailing: boolean) => {
		if (current.length === 0) return;
		// The newline that separated this run from the next belongs to this one.
		const text = current.join("\n");
		parts.push({ id: found === 0 ? null : anchorFor(found - 1), text: trailing ? `${text}\n` : text });
		current = [];
	};

	for (const line of lines) {
		if (found < headings.length && line === `## ${headings[found]}`) {
			finish(true);
			found++;
		}
		current.push(line);
	}
	finish(false);

	return parts;
}
