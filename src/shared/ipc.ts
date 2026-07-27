import type { ArticleResult } from "./article-result.js";
import type { ArticleSummary } from "./article-summary.js";
import type { Language } from "./article.js";
import type { PlatformId, PlatformSummary } from "./platform.js";
import type { Publication } from "./publication.js";
import type { RenderResult } from "./rendered.js";
import type { Settings, SettingsUpdate, VaultCheck } from "./settings.js";

/**
 * The channel names, in one place so neither side of the bridge can invent a
 * call the other does not answer.
 */
export const IPC = {
	readSettings: "settings:read",
	saveSettings: "settings:save",
	checkVault: "vault:check",
	listArticles: "articles:list",
	readArticle: "articles:read",
	renderArticle: "articles:render",
	listPublications: "publications:list",
	recordPublication: "publications:record",
	forgetPublication: "publications:forget",
	openEditor: "platform:open-editor",
	listPlatforms: "platform:list",
	copy: "clipboard:copy",
	version: "app:version",
} as const;

/**
 * Everything the renderer can reach — and the whole of it.
 *
 * The renderer has no Node, no `electron`, and no access to the domain. It asks
 * the main process, which owns every implementation. Widening this interface is
 * the only way to widen what the interface can do, which is the point of having
 * it: the surface is visible in one file rather than spread across call sites.
 */
export interface PressroomApi {
	readSettings(): Promise<Settings>;
	saveSettings(update: SettingsUpdate): Promise<Settings>;
	/** Talks to the vault, which is the only way to know the settings are right. */
	checkVault(): Promise<VaultCheck>;
	listArticles(): Promise<readonly ArticleSummary[]>;
	readArticle(slug: string): Promise<ArticleResult>;
	/** The same article as one platform will be handed it. */
	renderArticle(slug: string, platform: PlatformId): Promise<RenderResult>;

	listPublications(slug: string): Promise<readonly Publication[]>;
	/** Answers with the record as it stands afterwards. */
	recordPublication(slug: string, publication: Publication): Promise<readonly Publication[]>;
	forgetPublication(
		slug: string,
		platform: PlatformId,
		language: Language,
	): Promise<readonly Publication[]>;

	/**
	 * Opens that platform's submission in the browser the person already uses,
	 * where they are already signed in — carrying whatever fits in an address.
	 *
	 * An article and a platform, never an address: the addresses are built in
	 * the main process from the platform table, so the interface cannot send
	 * the browser somewhere it was not built to go.
	 */
	openEditor(slug: string, platform: PlatformId): Promise<void>;
	/** The platforms themselves, for the screen that describes them. */
	listPlatforms(): Promise<readonly PlatformSummary[]>;
	/**
	 * Puts text on the clipboard, optionally in two forms at once.
	 *
	 * A clipboard holds several forms of one thing and an editor takes what it
	 * understands: a plain-text field gets the source, a rich editor gets the
	 * document. Sending both is the difference between a pasted article and a
	 * pasted wall of characters.
	 */
	copy(text: string, html?: string): Promise<void>;
	/**
	 * Which build this is.
	 *
	 * A copy installed in /Applications and a copy running from the checkout
	 * look identical from the outside, and the one in /Applications is months
	 * old the moment something is fixed here. It has to be able to say so.
	 */
	version(): Promise<string>;
}
