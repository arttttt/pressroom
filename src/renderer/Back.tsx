/**
 * The way out of any screen that is not the desk.
 *
 * One control, in the same place and the same shape everywhere, so leaving an
 * article and leaving a platform's editor are the same gesture rather than two
 * conventions to learn. Only the wording moves, and only where it has to: from
 * a platform's page the way out leads back to the article, and calling that
 * "all articles" would be a lie about where the click goes.
 */
export function Back({
	onClick,
	label = "All articles",
}: {
	readonly onClick: () => void;
	readonly label?: string;
}) {
	return (
		<button type="button" className="back" onClick={onClick}>
			{label}
		</button>
	);
}
