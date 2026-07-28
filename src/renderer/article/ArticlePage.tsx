import { useEffect, useRef, useState } from "react";
import type { ArticleResult, AssembledDocument } from "../../shared/article-result.js";
import type { Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { Back } from "../Back.js";
import { unchanged, useWatch } from "../useWatch.js";
import { ArticleAside, type Chosen } from "./ArticleAside.js";
import { BodyViews } from "./BodyViews.js";
import { DestinationPanel } from "./DestinationPanel.js";

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
	const [revision, setRevision] = useState(0);

	// Only the newest read may speak. A poll can answer while the first read is
	// still in flight — and did, after "Try again", putting the older body back
	// on screen beside destinations already prepared from the newer one.
	const newest = useRef(0);

	useEffect(() => {
		newest.current += 1;
		const mine = newest.current;
		setResult(null);
		setChosen(null);
		setHere(targets);
		void window.pressroom.readArticle(slug).then((read) => {
			if (mine === newest.current) setResult(read);
		});
	}, [slug, attempt, targets]);

	// The article is being written in Obsidian while this page is open: a
	// section appears, a paragraph changes, a whole language appears. Both are
	// watched — the text for what is shown, the summary for where it can now
	// go, since a new language folder is a destination that has just become
	// reachable.
	//
	// The revision counts the times the text actually changed, and is what
	// tells each destination to prepare itself again: a panel showing what
	// Habr will receive is wrong the moment a section is edited, and finding
	// that out costs nothing beyond the read already being made here.
	const onScreen = useRef<ArticleResult | null>(null);
	onScreen.current = result;

	useWatch(
		slug,
		async () => {
			newest.current += 1;
			const mine = newest.current;
			return { mine, fresh: await window.pressroom.readArticle(slug) };
		},
		({ mine, fresh }) => {
			if (mine !== newest.current) return;
			if (onScreen.current !== null && JSON.stringify(onScreen.current) === JSON.stringify(fresh)) return;
			setResult(fresh);
			setRevision((count) => count + 1);
		},
	);

	// Counts the writes this page has made. A poll started before a write
	// answers with what the vault said before it, and blindly taking that
	// answer made a publication recorded a moment ago disappear again — so an
	// answer from before the last write is dropped rather than applied.
	//
	// Where a destination now stands is the vault's to say, not this page's. It
	// used to recompute that here from the publications alone, which could not
	// reach "nothing written in this language" at all: after Forget on a
	// language since removed, the panel offered to mark it published beside a
	// message saying there was nothing to send.
	const wrote = useRef(0);

	useWatch(
		slug,
		async () => ({ at: wrote.current, summary: await window.pressroom.readSummary(slug) }),
		({ at, summary }) => {
			if (at !== wrote.current) return;
			setHere((was) => unchanged(was, summary.targets));
		},
	);

	const documents = result?.kind === "ready" ? result.documents : [];

	// What was chosen may have gone: the language folder being read is renamed
	// in Obsidian, and the pane it fills empties with no explanation. A choice
	// whose subject is no longer there is no choice.
	const stillThere =
		chosen === null
			? null
			: chosen.kind === "document"
				? (documents.some((entry) => entry.language === chosen.language) ? chosen : null)
				: (here.some(
						(entry) =>
							entry.platform === chosen.target.platform && entry.language === chosen.target.language,
					)
						? chosen
						: null);

	// The article's own language opens first: it is the thing itself, and every
	// destination is a version of it. An article with no language folder yet has
	// no text to open — it falls through to its destinations rather than
	// rendering a page with nothing on it at all.
	const first = documents[0];
	const showing: Chosen | null =
		stillThere ??
		(first !== undefined
			? { kind: "document", language: first.language }
			: here[0] !== undefined
				? { kind: "destination", target: here[0] }
				: null);
	const document = showing?.kind === "document" ? documents.find((entry) => entry.language === showing.language) : undefined;
	const target = showing?.kind === "destination" ? here.find((entry) => entry.platform === showing.target.platform) : undefined;

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
									// Keyed by the destination, so choosing another builds a
									// fresh panel. Without it React reused this one and a
									// half-filled "Mark published" form carried over — the
									// address typed for Habr, recorded against Hacker News.
									key={`${target.platform}-${target.language}`}
									slug={slug}
									target={target}
									revision={revision}
									onRecord={async (publication) => {
										wrote.current += 1;
										setHere((await window.pressroom.recordPublication(slug, publication)).targets);
									}}
									onForget={async (forgotten) => {
										wrote.current += 1;
										setHere(
											(
												await window.pressroom.forgetPublication(
													slug,
													forgotten.platform,
													forgotten.language,
												)
											).targets,
										);
									}}
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
