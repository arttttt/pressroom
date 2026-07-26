import { useEffect, useState } from "react";
import type { ArticleResult, AssembledDocument } from "../../shared/article-result.js";
import type { Target } from "../../shared/platform.js";
import { Back } from "../Back.js";
import { Destinations } from "../destinations/Destinations.js";
import { renderMarkdown } from "../preview/markdown.js";

/**
 * One article: where it can go, and the text to take there.
 *
 * State first, prose second. The author wrote the text and can read it in
 * Obsidian; what they cannot see there is which of the five places it is ready
 * for, and whether the assembly came out whole.
 */
export function ArticlePage({
	slug,
	targets,
	onBack,
}: {
	readonly slug: string;
	readonly targets: readonly Target[];
	readonly onBack: () => void;
}) {
	const [result, setResult] = useState<ArticleResult | null>(null);
	// Same reason as on the desk: Obsidian may have come back since.
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let listening = true;
		setResult(null);
		void window.pressroom.readArticle(slug).then((read) => listening && setResult(read));
		return () => {
			listening = false;
		};
	}, [slug, attempt]);

	return (
		<article className="article">
			<Back onClick={onBack} />

			{result === null && <p className="quiet">Reading…</p>}

			{result?.kind === "unsupported" && (
				<>
					<h1>{slug}</h1>
					<p className="lead">Written as one note</p>
					<p className="quiet">
						Pressroom assembles an article from its section files. Split this one into a{" "}
						<code>sections/</code> folder with an index naming them in order, and it will appear here
					</p>
				</>
			)}

			{result?.kind === "failed" && (
				<>
					<h1>{slug}</h1>
					<p className="lead">This article could not be read</p>
					<p className="quiet">{result.reason}</p>
					<div className="actions">
						<button type="button" className="btn primary" onClick={() => setAttempt(attempt + 1)}>
							Try again
						</button>
					</div>
				</>
			)}

			{result?.kind === "ready" && (
				<>
					<h1>{result.title}</h1>
					<Destinations targets={targets} detailed />
					{result.documents.map((document) => (
						<Document key={document.language} document={document} />
					))}
				</>
			)}
		</article>
	);
}

/**
 * Three ways of looking at an assembled document, each answering a different
 * question: is it all there, how will it read, and what exactly gets pasted.
 */
type View = "outline" | "preview" | "markdown";

const VIEWS: readonly { readonly id: View; readonly label: string }[] = [
	{ id: "outline", label: "Outline" },
	{ id: "preview", label: "Preview" },
	{ id: "markdown", label: "Markdown" },
];

function Document({ document }: { readonly document: AssembledDocument }) {
	const [view, setView] = useState<View>("outline");
	const [copied, setCopied] = useState(false);

	async function copy() {
		await navigator.clipboard.writeText(document.body);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	}

	return (
		<section className="document">
			<header>
				<span className="lang">{document.language}</span>
				{/* The title each platform wants in its own title field, which is why
				    it is shown apart from the body rather than found inside it. */}
				<span className="headline">{document.title}</span>
				<span className="measure">
					{document.outline.length} sections · {document.body.length.toLocaleString("en")} characters
				</span>
				<span className="views">
					{VIEWS.map(({ id, label }) => (
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
			</header>

			{view === "outline" && (
				<ol className="outline">
					{document.outline.map((entry, position) => (
						<li key={`${position}-${entry.heading}`}>
							<span className="position">{position + 1}</span>
							<span className="heading">{entry.heading}</span>
							<span className="characters">{entry.characters.toLocaleString("en")}</span>
						</li>
					))}
				</ol>
			)}

			{view === "preview" && (
				/* The HTML is produced by a renderer that escapes markup rather than
				   passing it through, so nothing out of the vault can become an
				   element here. See renderer/preview/markdown.ts. */
				<div className="preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(document.body) }} />
			)}

			{view === "markdown" && <pre>{document.body}</pre>}
		</section>
	);
}
