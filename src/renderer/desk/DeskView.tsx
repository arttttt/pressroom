import { useEffect, useState } from "react";
import type { ArticleSummary } from "../../shared/article-summary.js";
import type { Target } from "../../shared/platform.js";

type Desk =
	| { readonly status: "loading" }
	| { readonly status: "ready"; readonly articles: readonly ArticleSummary[] }
	| { readonly status: "failed"; readonly reason: string };

/**
 * Every article against every place it can go.
 *
 * This is the question the application exists to answer, so it is the first
 * thing on screen: not what an article says — Obsidian shows that better — but
 * where its text is ready and where there is nothing to send.
 */
export function DeskView({
	onOpen,
	onSettings,
}: {
	readonly onOpen: (slug: string, targets: readonly Target[]) => void;
	readonly onSettings: () => void;
}) {
	const [desk, setDesk] = useState<Desk>({ status: "loading" });

	useEffect(() => {
		let listening = true;
		window.pressroom
			.listArticles()
			.then((articles) => listening && setDesk({ status: "ready", articles }))
			.catch((cause: unknown) => listening && setDesk({ status: "failed", reason: String(cause) }));
		return () => {
			listening = false;
		};
	}, []);

	if (desk.status === "loading") return <p className="quiet pad">Reading the vault…</p>;

	if (desk.status === "failed") {
		return (
			<div className="pad empty">
				<p className="notice">Pressroom cannot reach the vault</p>
				<p className="quiet">{desk.reason}</p>
				<button type="button" className="btn primary" onClick={onSettings}>
					Open settings
				</button>
			</div>
		);
	}

	if (desk.articles.length === 0) {
		return (
			<div className="pad empty">
				<p className="notice">No articles in the vault yet</p>
				<p className="quiet">A folder per article, a file per section. Pressroom picks them up from there</p>
			</div>
		);
	}

	// Every article offers the same targets in the same order, so one article's
	// list gives the columns and they never shift between rows.
	const columns = desk.articles[0]?.targets ?? [];

	return (
		<div className="desk">
			<table>
				<thead>
					<tr>
						<th className="slug">Article</th>
						{columns.map((target) => (
							<th key={`${target.platform}-${target.language}`} className="target">
								<span className="name">{target.displayName}</span>
								<span className="lang">{target.language}</span>
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{desk.articles.map((article) => (
						<Row key={article.slug} article={article} onOpen={onOpen} />
					))}
				</tbody>
			</table>
			<Legend />
		</div>
	);
}

function Row({
	article,
	onOpen,
}: {
	readonly article: ArticleSummary;
	readonly onOpen: (slug: string, targets: readonly Target[]) => void;
}) {
	const nothingReady = article.ready.length === 0;
	const open = () => onOpen(article.slug, article.targets);

	return (
		<tr
			className={nothingReady ? "waiting" : ""}
			onClick={open}
			tabIndex={0}
			onKeyDown={(event) => event.key === "Enter" && open()}
		>
			<th className="slug" scope="row">
				<span className="title">{article.slug}</span>
				{article.unsplit.length > 0 && (
					<span className="tag" title="Written as one note, from before the section layout">
						unsplit {article.unsplit.join(" ")}
					</span>
				)}
				{nothingReady && article.unsplit.length === 0 && <span className="tag">not started</span>}
			</th>
			{article.targets.map((target) => (
				<td key={`${target.platform}-${target.language}`}>
					<Mark target={target} />
				</td>
			))}
		</tr>
	);
}

/**
 * State is carried by the shape as well as the colour, so the desk stays
 * readable to someone who does not separate the two.
 */
function Mark({ target }: { readonly target: Target }) {
	const label =
		target.state === "ready"
			? `${target.displayName}: ${target.language} text ready`
			: `${target.displayName}: no ${target.language} text`;
	return <span className={`mark ${target.state}`} title={label} aria-label={label} />;
}

function Legend() {
	return (
		<p className="legend">
			<span className="mark ready" /> text ready to send
			<span className="mark missing" /> nothing written in that language
			<span className="spacer" />
			Nothing is published from here yet
		</p>
	);
}
