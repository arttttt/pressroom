import { useEffect, useState } from "react";
import type { ArticleResult, AssembledDocument } from "../../shared/article-result.js";
import type { Target } from "../../shared/platform.js";
import { Back } from "../Back.js";
import { Destinations } from "../destinations/Destinations.js";

/**
 * One article: where it can go, and the text to take there.
 *
 * State first, prose second. The author wrote the text and can read it in
 * Obsidian; what they cannot see there is which of the five places it is ready
 * for, so that comes first and the Markdown stays folded until asked for.
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

	useEffect(() => {
		let listening = true;
		void window.pressroom.readArticle(slug).then((read) => listening && setResult(read));
		return () => {
			listening = false;
		};
	}, [slug]);

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

function Document({ document }: { readonly document: AssembledDocument }) {
	const [showing, setShowing] = useState(false);
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
			</header>
			<div className="foot">
				<span className="measure">
					{document.sections} sections · {document.body.length.toLocaleString("en")} characters
				</span>
				<button type="button" className="btn small" onClick={() => setShowing(!showing)}>
					{showing ? "Hide Markdown" : "Show Markdown"}
				</button>
				<button type="button" className="btn small primary" onClick={() => void copy()}>
					{copied ? "Copied" : "Copy Markdown"}
				</button>
			</div>
			{showing && <pre>{document.body}</pre>}
		</section>
	);
}
