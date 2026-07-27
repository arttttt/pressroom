import { renderFor } from "../../domain/render/renderers.js";
import type { PlatformId } from "../../shared/platform.js";
import type { RenderResult } from "../../shared/rendered.js";
import type { SettingsStore } from "../settings/store.js";
import { connectToVault, forgetVaultConnection } from "../vault/connect.js";
import { UnsupportedArticleLayout } from "../../domain/vault/reader.js";

/**
 * An article as one platform will be handed it.
 *
 * Two callers want exactly this and must not diverge: the panel that shows
 * what a platform will receive, and the code that puts it into that platform's
 * editor. Showing one thing and sending another is the failure worth designing
 * out, so they ask the same question of the same function.
 *
 * It answers with a result rather than throwing: an article in the older
 * layout is a thing to say, not a failure of the call.
 */
export async function prepareFor(
	settings: SettingsStore,
	slug: string,
	platform: PlatformId,
): Promise<RenderResult> {
	try {
		const { reader, registry } = await connectToVault(await settings.read());
		const [article, published, announcement] = await Promise.all([
			reader.readArticle(slug),
			registry.list(slug),
			reader.readAnnouncement(slug, platform),
		]);
		return renderFor(article, platform, published, announcement);
	} catch (cause) {
		if (cause instanceof UnsupportedArticleLayout) {
			return { kind: "unsupported", platform, reason: cause.message };
		}
		// Anything else may well be a connection that has gone; the next attempt
		// starts a fresh conversation with the plugin rather than reusing it.
		forgetVaultConnection();
		return { kind: "failed", reason: cause instanceof Error ? cause.message : String(cause) };
	}
}
