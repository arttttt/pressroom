import { useEffect, useState } from "react";
import type { PlatformId } from "../../shared/platform.js";
import type { Rendered, RenderResult } from "../../shared/rendered.js";
import { BodyViews } from "./BodyViews.js";

/**
 * What each editor needs doing by hand, said where it is needed rather than
 * left to be remembered.
 */
/**
 * What has to be done by hand, and nothing else.
 *
 * Not an explanation of the platform: a step the person would otherwise miss.
 * Anything that only reassures or describes has no business on the screen.
 */
const NOTE: Partial<Readonly<Record<Rendered["platform"], string>>> = {
	habr: "Switch Markdown mode on in the editor's settings before pasting",
	hackernews: "Hacker News caps the title length; shorten a long one by hand",
};

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

	const rendered = result.rendered;

	return (
		// The same box a document sits in, so the two read as one construct
		// rather than as two that happen to show similar things.
		<div className="document prepared">
			<dl className="platform-fields">
				<Fields rendered={rendered} />
			</dl>
			{NOTE[rendered.platform] !== undefined && (
				<p className="quiet note">{NOTE[rendered.platform]}</p>
			)}
			{rendered.platform === "hackaday" ? (
				<Email rendered={rendered} />
			) : rendered.platform === "reddit" || rendered.platform === "hackernews" ? (
				<Announcement rendered={rendered} />
			) : (
				<BodyViews body={rendered.body} startHidden />
			)}
		</div>
	);
}

/** The fields belonging to one platform and to no other. */
function Fields({ rendered }: { readonly rendered: Rendered }) {
	switch (rendered.platform) {
		case "habr":
			return (
				<>
					<dt>Title field</dt>
					<dd>{rendered.title}</dd>
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
		case "hackernoon":
			return (
				<>
					<dt>Title field</dt>
					<dd>{rendered.title}</dd>
					<dt>First seen at</dt>
					<dd className={rendered.firstSeenAt === null ? "quiet" : ""}>
						{rendered.firstSeenAt ??
							"left blank — nothing in English has gone out yet, so this is the original"}
					</dd>
				</>
			);
		case "reddit":
		case "hackernews":
			return (
				<>
					<dt>Title</dt>
					<dd>
						{rendered.title}
						<span className="count">{rendered.title.length} characters</span>
					</dd>
					<dt>Link</dt>
					<dd>
						<a href={rendered.url}>{rendered.url}</a>
					</dd>
				</>
			);
		case "hackaday":
			return (
				<>
					<dt>To</dt>
					<dd>{rendered.to}</dd>
					<dt>Subject</dt>
					<dd>{rendered.subject}</dd>
				</>
			);
	}
}

/** A message about the article: a title, a link, and words where there are any. */
function Announcement({
	rendered,
}: {
	readonly rendered: Extract<Rendered, { platform: "reddit" | "hackernews" }>;
}) {
	const words = rendered.platform === "reddit" ? rendered.comment : null;
	const [copied, setCopied] = useState<"title" | "link" | "words" | null>(null);

	async function copy(what: "title" | "link" | "words", text: string) {
		await navigator.clipboard.writeText(text);
		setCopied(what);
		window.setTimeout(() => setCopied(null), 1600);
	}

	return (
		<div className="announcement">
			<div className="toolbar">
				<button type="button" className="btn small" onClick={() => void copy("title", rendered.title)}>
					{copied === "title" ? "Copied" : "Copy title"}
				</button>
				<button type="button" className="btn small primary" onClick={() => void copy("link", rendered.url)}>
					{copied === "link" ? "Copied" : "Copy link"}
				</button>
			</div>
			{words === null ? (
				rendered.platform === "reddit" && (
					<p className="quiet inset">
						Write them in <code>announcements/reddit.md</code> beside the article
					</p>
				)
			) : (
				<>
					<p className="comment">{words}</p>
					<div className="toolbar">
						<button type="button" className="btn small" onClick={() => void copy("words", words)}>
							{copied === "words" ? "Copied" : "Copy the comment"}
						</button>
					</div>
				</>
			)}
		</div>
	);
}

/** A tip to an editor's inbox, opened in the mail client for a person to send. */
function Email({ rendered }: { readonly rendered: Extract<Rendered, { platform: "hackaday" }> }) {
	const [copied, setCopied] = useState(false);

	return (
		<div className="announcement">
			<p className="comment">{rendered.body}</p>
			<div className="toolbar">
				<a className="btn small primary" href={rendered.mailto}>
					Open in Mail
				</a>
				<button
					type="button"
					className="btn small"
					onClick={() =>
						void navigator.clipboard.writeText(rendered.body).then(() => {
							setCopied(true);
							window.setTimeout(() => setCopied(false), 1600);
						})
					}
				>
					{copied ? "Copied" : "Copy the message"}
				</button>
			</div>
		</div>
	);
}
