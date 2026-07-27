import type { ArticleResult } from "./article-result.js";
import type { ArticleSummary } from "./article-summary.js";
import type { Language } from "./article.js";
import type { FillResult, Navigation, PageState, ViewBounds } from "./browser.js";
import type { PlatformId } from "./platform.js";
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
	openPlatform: "platform:open",
	movePlatform: "platform:move",
	closePlatform: "platform:close",
	navigatePlatform: "platform:navigate",
	signInTo: "platform:sign-in",
	/** Pushed by the main process as the page navigates, not asked for. */
	platformState: "platform:state",
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
	 * Brings the platform's own page into the window, in the space the
	 * interface has left for it, and answers with what that page is.
	 *
	 * The page is a native view over the interface rather than an element in
	 * it, so these four calls are the whole of what the interface can do with
	 * it: put it somewhere, move it, take it away, and walk it between the
	 * platform's own pages.
	 */
	openPlatform(platform: PlatformId, bounds: ViewBounds): Promise<PageState>;
	movePlatform(bounds: ViewBounds): Promise<void>;
	closePlatform(): Promise<void>;
	navigatePlatform(where: Navigation): Promise<void>;
	/**
	 * Puts the login from the password manager into the platform's sign-in
	 * form, and stops there. Nothing is submitted.
	 */
	signInTo(platform: PlatformId): Promise<FillResult>;
	/** Follows the page as it navigates. Answers with the way to stop. */
	onPlatformState(listener: (state: PageState) => void): () => void;
}
