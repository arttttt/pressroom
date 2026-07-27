import { useEffect, useState } from "react";
import type { PlatformId } from "../../shared/platform.js";
import type { Rendered, RenderResult } from "../../shared/rendered.js";
import { BodyViews } from "./BodyViews.js";

/**
 * What each editor needs doing by hand, said where it is needed rather than
 * left to be remembered.
 */
const NOTE = {
	habr: "Habr renders this only with Markdown mode switched on in its editor's settings, which has to be done before the text is pasted",
	hackernoon:
		"HackerNoon takes Markdown in Editor 3.0, and the story is submitted for review rather than published — so it goes out days later, and is worth recording here only once it does",
} as const;

/** The fields belonging to one platform and to no other. */
function Fields({ rendered }: { readonly rendered: Rendered }) {
	if (rendered.platform === "habr") {
		return (
			<>
				<dt>Hubs</dt>
				<dd className={rendered.hubs.length === 0 ? "quiet" : ""}>
					{rendered.hubs.length === 0 ? "chosen when publishing" : rendered.hubs.join(", ")}
				</dd>
				<dt>Tags</dt>
				<dd className={rendered.tags.length === 0 ? "quiet" : ""}>
					{rendered.tags.length === 0 ? "chosen when publishing" : rendered.tags.join(", ")}
				</dd>
			</>
		);
	}

	return (
		<>
			<dt>First seen at</dt>
			<dd className={rendered.firstSeenAt === null ? "quiet" : ""}>
				{rendered.firstSeenAt ??
					"left blank — nothing in English has gone out yet, so this is the original"}
			</dd>
		</>
	);
}

/**
 * What one platform will actually be handed.
 *
 * Sits inside its own destination rather than below the list: the text and the
 * fields belong to that row, and a panel elsewhere on the page makes the reader
 * work out which row it answered.
 */
export function PlatformPanel({
	slug,
	platform,
}: {
	readonly slug: string;
	readonly platform: PlatformId;
}) {
	const [result, setResult] = useState<RenderResult | null>(null);

	useEffect(() => {
		let listening = true;
		setResult(null);
		void window.pressroom
			.renderArticle(slug, platform)
			.then((rendered) => listening && setResult(rendered));
		return () => {
			listening = false;
		};
	}, [slug, platform]);

	if (result === null) return <p className="quiet">Preparing…</p>;
	if (result.kind === "unsupported") return <p className="quiet">{result.reason}</p>;
	if (result.kind === "failed") return <p className="failed">{result.reason}</p>;

	return (
		// The same box a document sits in, so the two read as one construct
		// rather than as two that happen to show similar things.
		<div className="document prepared">
			{/* Label and value on one line each, aligned down the page: three
			    fields laid out as blocks left a half-empty row beside the short
			    ones and pushed the title against the label under it. */}
			<dl className="platform-fields">
				<dt>Title field</dt>
				<dd>{result.rendered.title}</dd>
				<Fields rendered={result.rendered} />
			</dl>
			<p className="quiet note">{NOTE[result.rendered.platform]}</p>
			<BodyViews body={result.rendered.body} startHidden />
		</div>
	);
}
