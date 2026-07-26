import { useState } from "react";
import type { Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";

/**
 * Recording where an article went.
 *
 * Pressroom does not publish, so it cannot know this by itself — the address
 * is pasted in after the fact. That is the honest shape of it: the person
 * pressed the button, and this is them telling the record.
 */
export function MarkPublished({
	target,
	today,
	onRecord,
	onCancel,
}: {
	readonly target: Target;
	readonly today: string;
	readonly onRecord: (publication: Publication) => Promise<void>;
	readonly onCancel: () => void;
}) {
	const [url, setUrl] = useState("");
	const [publishedAt, setPublishedAt] = useState(today);
	const [busy, setBusy] = useState(false);

	const usable = url.trim().startsWith("http");

	async function record() {
		setBusy(true);
		try {
			await onRecord({
				platform: target.platform,
				language: target.language,
				url: url.trim(),
				publishedAt,
				// The first place an article goes out becomes the one the
				// announcements point at; the record settles that, not this form.
				canonical: false,
			});
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="mark-published">
			<label>
				<span className="field">Address on {target.displayName}</span>
				<input
					value={url}
					onChange={(event) => setUrl(event.target.value)}
					placeholder="https://"
					spellCheck={false}
					autoFocus
				/>
			</label>
			<label className="when">
				<span className="field">Published</span>
				<input value={publishedAt} onChange={(event) => setPublishedAt(event.target.value)} />
			</label>
			<div className="actions">
				<button type="button" className="btn small primary" disabled={!usable || busy} onClick={() => void record()}>
					{busy ? "Recording…" : "Record"}
				</button>
				<button type="button" className="btn small" disabled={busy} onClick={onCancel}>
					Cancel
				</button>
			</div>
		</div>
	);
}
