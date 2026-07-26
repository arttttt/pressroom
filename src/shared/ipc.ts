import type { ArticleResult } from "./article-result.js";
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
	listArticles(): Promise<readonly string[]>;
	readArticle(slug: string): Promise<ArticleResult>;
}
