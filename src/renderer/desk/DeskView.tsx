import { useEffect, useState } from "react";
import type { ArticleSummary } from "../../shared/article-summary.js";
import type { Target } from "../../shared/platform.js";
import { Destinations } from "../destinations/Destinations.js";

type Desk =
	| { readonly status: "loading" }
	| { readonly status: "ready"; readonly articles: readonly ArticleSummary[] }
	| { readonly status: "failed"; readonly reason: string };

/**
 * What can be sent, and what is not ready yet.
 *
 * Split in two because that is the shape of the vault: a couple of articles
 * worth acting on and a long tail of drafts. Giving both the same weight — a
 * row each in one long list — buries the two that matter under eleven that do
 * not.
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
				<h1>Pressroom cannot reach the vault</h1>
				<p className="quiet">{desk.reason}</p>
				<button type="button" className="btn primary" onClick={onSettings}>
					Open settings
				</button>
			</div>
		);
	}

	const ready = desk.articles.filter((article) => article.ready.length > 0);
	const waiting = desk.articles.filter((article) => article.ready.length === 0);

	if (desk.articles.length === 0) {
		return (
			<div className="pad empty">
				<h1>Nothing in the vault yet</h1>
				<p className="quiet">A folder per article, a file per section. Pressroom picks them up from there</p>
			</div>
		);
	}

	return (
		<div className="desk">
			{ready.length === 0 ? (
				<section>
					<h1>Nothing is ready to send</h1>
					<p className="quiet">
						Pressroom assembles an article from its section files. Split one into a{" "}
						<code>sections/</code> folder with an index naming them in order, and it appears here
					</p>
				</section>
			) : (
				<section>
					<Heading label="Ready to send" count={ready.length} />
					{ready.map((article) => (
						<button
							key={article.slug}
							type="button"
							className="card"
							onClick={() => onOpen(article.slug, article.targets)}
						>
							<span className="headline">{article.slug}</span>
							{/* No separate list of languages: the destinations below already
							    say which language each one takes, and whether it exists. */}
							<Destinations targets={article.targets} />
						</button>
					))}
				</section>
			)}

			{waiting.length > 0 && (
				<section className="waiting">
					<Heading label="Not ready" count={waiting.length} />
					<ul>
						{waiting.map((article) => (
							<li key={article.slug}>
								<button type="button" onClick={() => onOpen(article.slug, article.targets)}>
									<span className="title">{article.slug}</span>
									<span className="why">
										{article.unsplit.length > 0 ? "written as one note" : "no text yet"}
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}

function Heading({ label, count }: { readonly label: string; readonly count: number }) {
	return (
		<h2>
			{label}
			<span className="count">{count}</span>
		</h2>
	);
}
