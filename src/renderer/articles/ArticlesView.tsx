import { useEffect, useState } from "react";
import type { ArticleResult } from "../../shared/article-result.js";
import { ArticleDetail } from "./ArticleDetail.js";

type Listing =
	| { readonly status: "loading" }
	| { readonly status: "ready"; readonly slugs: readonly string[] }
	| { readonly status: "failed"; readonly reason: string };

/**
 * The articles in the vault, and one of them opened.
 *
 * Every folder is listed, including the ones written before the section layout
 * existed. Those say so when opened rather than being hidden, which is the
 * difference between a list of the vault and a list of what happens to work.
 */
export function ArticlesView() {
	const [listing, setListing] = useState<Listing>({ status: "loading" });
	const [opened, setOpened] = useState<ArticleResult | null>(null);
	const [reading, setReading] = useState<string | null>(null);

	useEffect(() => {
		let listening = true;
		window.pressroom
			.listArticles()
			.then((slugs) => listening && setListing({ status: "ready", slugs }))
			.catch((cause: unknown) => listening && setListing({ status: "failed", reason: String(cause) }));
		return () => {
			listening = false;
		};
	}, []);

	async function open(slug: string) {
		setReading(slug);
		setOpened(await window.pressroom.readArticle(slug));
		setReading(null);
	}

	if (listing.status === "loading") return <p className="waiting">Reading the vault…</p>;
	if (listing.status === "failed") {
		return (
			<p className="failed">
				{listing.reason} — check the address and key under Settings, and that Obsidian is running.
			</p>
		);
	}

	return (
		<section className="articles">
			<ul className="list">
				{listing.slugs.map((slug) => (
					<li key={slug}>
						<button
							type="button"
							className={opened?.slug === slug ? "current" : ""}
							disabled={reading !== null}
							onClick={() => void open(slug)}
						>
							{slug}
						</button>
					</li>
				))}
			</ul>
			<div className="detail">
				{opened === null ? <p className="lede">Pick an article.</p> : <ArticleDetail result={opened} />}
			</div>
		</section>
	);
}
