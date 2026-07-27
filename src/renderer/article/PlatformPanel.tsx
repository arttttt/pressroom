import type { Rendered, RenderResult } from "../../shared/rendered.js";
import { CopyButton } from "../CopyButton.js";
import { BodyViews } from "./BodyViews.js";

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

export function PlatformPanel({ result }: { readonly result: RenderResult }) {
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
					<dd className="takeable">
						<span>{rendered.title}</span>
						<CopyButton text={rendered.title} label="Copy the title" />
					</dd>
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
					<dd className="takeable">
						<span>{rendered.title}</span>
						<CopyButton text={rendered.title} label="Copy the title" />
					</dd>
					<dt>First seen at</dt>
					{rendered.firstSeenAt === null ? (
						<dd className="quiet">left blank — this is the original</dd>
					) : (
						<dd className="takeable">
							<span>{rendered.firstSeenAt}</span>
							<CopyButton text={rendered.firstSeenAt} label="Copy" />
						</dd>
					)}
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

	return (
		<div className="announcement">
			<div className="toolbar">
				<CopyButton text={rendered.title} label="Copy title" />
				<CopyButton text={rendered.url} label="Copy link" primary />
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
						<CopyButton text={words} label="Copy the comment" />
					</div>
				</>
			)}
		</div>
	);
}

/** A tip to an editor's inbox, opened in the mail client for a person to send. */
function Email({ rendered }: { readonly rendered: Extract<Rendered, { platform: "hackaday" }> }) {
	return (
		<div className="announcement">
			<p className="comment">{rendered.body}</p>
			<div className="toolbar">
				<a className="btn small primary" href={rendered.mailto}>
					Open in Mail
				</a>
				<CopyButton text={rendered.body} label="Copy the message" />
			</div>
		</div>
	);
}
