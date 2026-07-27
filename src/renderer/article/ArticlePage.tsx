import { useEffect, useState } from "react";
import type { ArticleResult, AssembledDocument } from "../../shared/article-result.js";
import type { Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { Back } from "../Back.js";
import { PlatformScreen } from "../platform/PlatformScreen.js";
import { ArticleAside, type Chosen } from "./ArticleAside.js";
import { BodyViews } from "./BodyViews.js";
import { DestinationPanel } from "./DestinationPanel.js";
import { localDate } from "./today.js";

/**
 * One article: its text, and every place it can go.
 *
 * A list beside what it selects rather than a stack that expands. Rows that
 * open push everything under them down the page, so the list reflows at every
 * click and the detail ends up buried in the list that was meant to stay
 * scannable — which is what this replaced.
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
	// Where it has gone. Held here rather than taken from the desk's summary,
	// because recording one changes it and the page has to show that at once.
	const [here, setHere] = useState<readonly Target[]>(targets);
	const [chosen, setChosen] = useState<Chosen | null>(null);
	// Same reason as on the desk: Obsidian may have come back since.
	const [attempt, setAttempt] = useState(0);
	// A platform's page is shown from here rather than from the application's
	// screens, so that coming back from it finds the article as it was left —
	// the destination still chosen, and a publication recorded a moment ago
	// still recorded.
	const [opened, setOpened] = useState<Target | null>(null);

	useEffect(() => {
		let listening = true;
		setResult(null);
		setChosen(null);
		setHere(targets);
		void window.pressroom.readArticle(slug).then((read) => listening && setResult(read));
		return () => {
			listening = false;
		};
	}, [slug, attempt, targets]);

	/** The record decides what is canonical, so the answer replaces what we had. */
	function applied(publications: readonly Publication[]): readonly Target[] {
		return here.map((target) => {
			const out = publications.find(
				(publication) => publication.platform === target.platform && publication.language === target.language,
			);
			if (out !== undefined) return { ...target, state: "published" as const, url: out.url };
			return target.state === "published" ? { ...target, state: "ready" as const, url: null } : target;
		});
	}

	const documents = result?.kind === "ready" ? result.documents : [];
	// The article's own language opens first: it is the thing itself, and every
	// destination is a version of it.
	const showing = chosen ?? (documents[0] === undefined ? null : { kind: "document" as const, language: documents[0].language });
	const document = showing?.kind === "document" ? documents.find((entry) => entry.language === showing.language) : undefined;
	const target = showing?.kind === "destination" ? here.find((entry) => entry.platform === showing.target.platform) : undefined;

	// Escape leaves the platform's page for the article rather than leaving the
	// article for the desk. Registered on the way down, where it runs before
	// the screen-level listener that would otherwise skip a level — the order
	// listeners were added in cannot be relied on, the phase can.
	useEffect(() => {
		if (opened === null) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.stopPropagation();
			setOpened(null);
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [opened]);

	if (opened !== null) {
		return <PlatformScreen target={opened} onBack={() => setOpened(null)} />;
	}

	return (
		<article className="article">
			<Back onClick={onBack} />

			{result === null && <p className="quiet">Reading…</p>}

			{result?.kind === "unsupported" && (
				<>
					<h1>{slug}</h1>
					<p className="lead">Written as one note</p>
					<p className="quiet">
						Split it into a <code>sections/</code> folder with an index naming them in order
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

			{result?.kind === "ready" && showing !== null && (
				<>
					<h1>{result.title}</h1>
					<div className="article-body">
						<ArticleAside
							documents={documents}
							targets={here}
							chosen={showing}
							onChoose={setChosen}
						/>
						<div className="chosen">
							{document !== undefined && <Document document={document} />}
							{target !== undefined && (
								<DestinationPanel
									slug={slug}
									target={target}
									today={localDate(new Date())}
									onRecord={async (publication) =>
										setHere(applied(await window.pressroom.recordPublication(slug, publication)))
									}
									onForget={async (forgotten) =>
										setHere(
											applied(
												await window.pressroom.forgetPublication(slug, forgotten.platform, forgotten.language),
											),
										)
									}
									onOpen={setOpened}
								/>
							)}
						</div>
					</div>
				</>
			)}
		</article>
	);
}

function Document({ document }: { readonly document: AssembledDocument }) {
	return (
		<section className="document">
			<header>
				<span className="lang">{document.language}</span>
				{/* The title each platform wants in its own title field, which is why
				    it is shown apart from the body rather than found inside it. */}
				<span className="headline">{document.title}</span>
			</header>
			<BodyViews body={document.body} outline={document.outline} />
		</section>
	);
}
