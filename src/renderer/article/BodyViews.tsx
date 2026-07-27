import { useMemo, useState } from "react";
import type { OutlineEntry } from "../../shared/article-result.js";
import { CopyButton } from "../CopyButton.js";
import { Contents } from "../preview/Contents.js";
import { renderMarkdown } from "../preview/markdown.js";
import { splitSource } from "../preview/source.js";

/**
 * Ways of looking at one body of text, each answering a different question:
 * the outline says whether it is all there, the preview how it will read, the
 * Markdown exactly what gets pasted. `hidden` is none of them — the text is
 * there to be taken rather than read.
 */
type View = "hidden" | "outline" | "preview" | "markdown";

/**
 * One body of text and the ways of looking at it, identical wherever it
 * appears — under an article and under a destination — so what is learned in
 * one place holds in the other.
 *
 * `startHidden` is for a destination: opening one is asking what it will
 * receive and taking it, not settling down to read twenty thousand characters,
 * and unrolling all of them pushes every other destination off the screen.
 */
export function BodyViews({
	body,
	outline,
	startHidden = false,
	html = null,
}: {
	readonly body: string;
	readonly outline?: readonly OutlineEntry[];
	readonly startHidden?: boolean;
	/** The same text as a document, where the receiving editor wants one. */
	readonly html?: string | null;
}) {
	const [view, setView] = useState<View>(
		startHidden ? "hidden" : outline === undefined ? "preview" : "outline",
	);

	// Parsing twenty thousand characters is not something to redo because a
	// button said "Copied" — and the contents re-renders with every section
	// that passes while scrolling.
	const preview = useMemo(() => renderMarkdown(body), [body]);
	const source = useMemo(
		() => splitSource(body, preview.sections.map((section) => section.heading)),
		[body, preview],
	);

	const views: readonly { readonly id: View; readonly label: string }[] = [
		...(outline === undefined ? [] : [{ id: "outline" as const, label: "Outline" }]),
		{ id: "preview", label: "Preview" },
		{ id: "markdown", label: "Markdown" },
	];

	const sections = outline?.length ?? preview.sections.length;

	return (
		<>
			<div className="toolbar">
				{view === "hidden" ? (
					<button type="button" className="btn small" onClick={() => setView(views[0]?.id ?? "preview")}>
						Show the text
					</button>
				) : (
					<span className="views">
						{views.map(({ id, label }) => (
							<button
								key={id}
								type="button"
								className={view === id ? "current" : ""}
								aria-pressed={view === id}
								onClick={() => setView(id)}
							>
								{label}
							</button>
						))}
						{startHidden && (
							<button type="button" onClick={() => setView("hidden")}>
								Hide
							</button>
						)}
					</span>
				)}

				<span className="measure">
					{sections} sections · {body.length.toLocaleString("en")} characters
				</span>

				<CopyButton text={body} html={html} label="Copy the text" primary />
			</div>

			{view === "outline" && outline !== undefined && (
				<ol className="outline">
					{outline.map((entry, position) => (
						<li key={`${position}-${entry.heading}`}>
							<span className="position">{position + 1}</span>
							<span className="heading">{entry.heading}</span>
							<span className="characters">{entry.characters.toLocaleString("en")}</span>
						</li>
					))}
				</ol>
			)}

			{view === "preview" && (
				<div className="reading">
					{/* The HTML is produced by a renderer that escapes markup rather
					    than passing it through, so nothing out of the vault can become
					    an element here. See renderer/preview/markdown.ts. */}
					<div className="preview" dangerouslySetInnerHTML={{ __html: preview.html }} />
					<Contents sections={preview.sections} />
				</div>
			)}

			{view === "markdown" && (
				<div className="reading">
					<pre>
						{source.map((part, index) => (
							<span key={part.id ?? `head-${index}`} {...(part.id === null ? {} : { id: part.id })}>
								{part.text}
							</span>
						))}
					</pre>
					<Contents sections={preview.sections} />
				</div>
			)}
		</>
	);
}
