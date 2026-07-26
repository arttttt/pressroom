import { useEffect, useState } from "react";
import type { PlatformId } from "../../shared/platform.js";
import type { RenderResult } from "../../shared/rendered.js";
import { BodyViews } from "./BodyViews.js";

/**
 * What one platform will actually be handed.
 *
 * Separate from the assembled document because they are different things: the
 * document is the article, this is the article after a platform's dialect has
 * been applied to it — and it carries the platform's own fields, which have to
 * be filled in beside the text rather than inside it.
 */
export function PlatformPanel({
	slug,
	platform,
	displayName,
	onClose,
}: {
	readonly slug: string;
	readonly platform: PlatformId;
	readonly displayName: string;
	readonly onClose: () => void;
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

	return (
		<section className="document platform">
			<header>
				<span className="lang">{displayName}</span>
				{result?.kind === "rendered" && <span className="headline">{result.rendered.title}</span>}
				<button type="button" className="btn small close" onClick={onClose}>
					Close
				</button>
			</header>

			{result === null && <p className="quiet inset">Preparing…</p>}

			{result?.kind === "unsupported" && <p className="quiet inset">{result.reason}</p>}
			{result?.kind === "failed" && <p className="inset failed">{result.reason}</p>}

			{result?.kind === "rendered" && (
				<>
					<dl className="platform-fields">
						<div>
							<dt>Title field</dt>
							<dd>{result.rendered.title}</dd>
						</div>
						<div>
							<dt>Hubs</dt>
							<dd className={result.rendered.hubs.length === 0 ? "quiet" : ""}>
								{result.rendered.hubs.length === 0 ? "chosen when publishing" : result.rendered.hubs.join(", ")}
							</dd>
						</div>
						<div>
							<dt>Tags</dt>
							<dd className={result.rendered.tags.length === 0 ? "quiet" : ""}>
								{result.rendered.tags.length === 0 ? "chosen when publishing" : result.rendered.tags.join(", ")}
							</dd>
						</div>
					</dl>
					<p className="quiet inset note">
						Habr renders this only with Markdown mode switched on in its editor's settings, which has
						to be done before the text is pasted
					</p>
					<BodyViews body={result.rendered.body} />
				</>
			)}
		</section>
	);
}
