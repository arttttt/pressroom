import { useState } from "react";
import type { ArticleResult } from "../../shared/article-result.js";

/** One opened article: its assembled documents, or why it could not be read. */
export function ArticleDetail({ result }: { readonly result: ArticleResult }) {
	if (result.kind === "unsupported") {
		return (
			<div className="unsupported">
				<h2>{result.slug}</h2>
				<p>{result.reason}</p>
			</div>
		);
	}

	if (result.kind === "failed") {
		return (
			<div className="failed">
				<h2>{result.slug}</h2>
				<p>{result.reason}</p>
			</div>
		);
	}

	return (
		<div>
			<h2>{result.title}</h2>
			{result.documents.length === 0 && <p className="lede">No language has been started yet.</p>}
			{result.documents.map((document) => (
				<Document key={document.language} {...document} />
			))}
		</div>
	);
}

function Document({
	language,
	title,
	sections,
	body,
}: {
	readonly language: string;
	readonly title: string;
	readonly sections: number;
	readonly body: string;
}) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		await navigator.clipboard.writeText(body);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1500);
	}

	return (
		<article className="document">
			<header>
				<span className="language">{language}</span>
				<span className="title">{title}</span>
				<span className="count">
					{sections} sections · {body.length.toLocaleString()} characters
				</span>
				<button type="button" onClick={() => void copy()}>
					{copied ? "Copied" : "Copy Markdown"}
				</button>
			</header>
			<pre>{body}</pre>
		</article>
	);
}
