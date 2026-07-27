import { useState } from "react";

/**
 * Taking one piece of a prepared article away with you.
 *
 * The whole of what Pressroom does at the end is hand text over: a title, a
 * body, an address. That gesture is the same everywhere, so it is one control
 * — and it says what it took, because a panel with four buttons all reading
 * "Copy" leaves you guessing which one you pressed.
 *
 * `html` is the same text as a document rather than as its source, for the
 * editors that want one. Both forms go on the clipboard together and the
 * receiving editor takes whichever it understands.
 */
export function CopyButton({
	text,
	html = null,
	label = "Copy",
	primary = false,
}: {
	readonly text: string;
	readonly html?: string | null;
	readonly label?: string;
	readonly primary?: boolean;
}) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		await (html === null ? window.pressroom.copy(text) : window.pressroom.copy(text, html));
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	}

	return (
		<button
			type="button"
			className={primary ? "btn small primary" : "btn small"}
			onClick={() => void copy()}
		>
			{copied ? "Copied" : label}
		</button>
	);
}
