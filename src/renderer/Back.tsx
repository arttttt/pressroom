/**
 * The way out of any screen that is not the desk.
 *
 * One control, worded the same everywhere, so leaving an article and leaving
 * the settings are the same gesture rather than two conventions to learn.
 */
export function Back({ onClick }: { readonly onClick: () => void }) {
	return (
		<button type="button" className="back" onClick={onClick}>
			All articles
		</button>
	);
}
