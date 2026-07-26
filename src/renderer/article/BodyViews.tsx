import { useMemo, useState } from "react";
import type { OutlineEntry } from "../../shared/article-result.js";
import { Contents } from "../preview/Contents.js";
import { renderMarkdown } from "../preview/markdown.js";
import { splitSource } from "../preview/source.js";

/**
 * Ways of looking at one body of text, each answering a different question:
 * the outline says whether it is all there, the preview how it will read, the
 * Markdown exactly what gets pasted.
 */
type View = "outline" | "preview" | "markdown";

/**
 * The same three views over an assembled document and over what a platform is
 * handed, so what is learned on one is true of the other.
 *
 * The outline is optional because it answers a question only the assembled
 * document raises — did eleven files come out whole. What a platform receives
 * has already been through that check.
 */
export function BodyViews({
	body,
	outline,
}: {
	readonly body: string;
	readonly outline?: readonly OutlineEntry[];
}) {
	const [view, setView] = useState<View>(outline === undefined ? "preview" : "outline");
	const [copied, setCopied] = useState(false);

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

	async function copy() {
		await navigator.clipboard.writeText(body);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	}

	return (
		<>
			<div className="toolbar">
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
				</span>
				<button type="button" className="btn small primary" onClick={() => void copy()}>
					{copied ? "Copied" : "Copy"}
				</button>
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
