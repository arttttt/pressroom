import { useEffect, useState } from "react";
import type { PlatformId } from "../../shared/platform.js";
import type { RenderResult } from "../../shared/rendered.js";
import { BodyViews } from "./BodyViews.js";

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

				<dt>Hubs</dt>
				<dd className={result.rendered.hubs.length === 0 ? "quiet" : ""}>
					{result.rendered.hubs.length === 0 ? "chosen when publishing" : result.rendered.hubs.join(", ")}
				</dd>

				<dt>Tags</dt>
				<dd className={result.rendered.tags.length === 0 ? "quiet" : ""}>
					{result.rendered.tags.length === 0 ? "chosen when publishing" : result.rendered.tags.join(", ")}
				</dd>
			</dl>
			<p className="quiet note">
				Habr renders this only with Markdown mode switched on in its editor's settings, which has to be
				done before the text is pasted
			</p>
			<BodyViews body={result.rendered.body} startHidden />
		</div>
	);
}
