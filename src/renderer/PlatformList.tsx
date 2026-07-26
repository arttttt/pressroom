import type { Delivery, Platform } from "../shared/platform.js";

/** How a platform's delivery mode reads on screen. */
function describe(delivery: Delivery): string {
	switch (delivery.kind) {
		case "api":
			return "API — no browser involved";
		case "browser":
			return delivery.editorUrl;
		case "email":
			return delivery.to;
	}
}

export function PlatformList({ platforms }: { readonly platforms: readonly Platform[] }) {
	return (
		<ul className="platforms">
			{platforms.map((platform) => (
				<li key={platform.id}>
					<span className="name">{platform.displayName}</span>
					<span className="languages">{platform.languages.join(", ")}</span>
					<span className="delivery">{describe(platform.delivery)}</span>
				</li>
			))}
		</ul>
	);
}
