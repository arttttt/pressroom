import { useState } from "react";
import type { Target } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import { recordable } from "./recordable.js";

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

	const usable = recordable(url, publishedAt, today);

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
				{/* A date field rather than a typed string: it opens a calendar, it
				    rejects the 31st of February, and the value it yields is already
				    the `YYYY-MM-DD` the record is written in. `max` is today —
				    an article cannot have gone out tomorrow, and a mistyped year
				    is otherwise silently recorded. */}
				<input
					type="date"
					value={publishedAt}
					max={today}
					onChange={(event) => setPublishedAt(event.target.value)}
					// The whole field opens the calendar; by default only the little
					// indicator does, which is a target the size of a full stop.
					onClick={(event) => event.currentTarget.showPicker()}
				/>
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
