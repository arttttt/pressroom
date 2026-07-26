import { ipcMain } from "electron";
import { targetsFor } from "../../domain/platforms/targets.js";
import { assembleMarkdown } from "../../domain/render/markdown.js";
import { UnsupportedArticleLayout } from "../../domain/vault/reader.js";
import type { ArticleResult, AssembledDocument } from "../../shared/article-result.js";
import type { ArticleSummary } from "../../shared/article-summary.js";
import { IPC } from "../../shared/ipc.js";
import type { Settings, SettingsUpdate, VaultCheck } from "../../shared/settings.js";
import { type SettingsStore, visible } from "../settings/store.js";
import { connectToVault } from "../vault/connect.js";

/**
 * The settings and the vault, as the interface sees them.
 *
 * Reading an article answers with a result rather than throwing: an article in
 * the older layout is a thing to display, not a failure of the call. Anything
 * that is genuinely broken — no key, no Obsidian — is a separate kind, because
 * the interface should not tell the author to split their article when the
 * problem is that the plugin is switched off.
 */
export function registerVaultHandlers(settings: SettingsStore): void {
	ipcMain.handle(IPC.readSettings, async (): Promise<Settings> => visible(await settings.read()));

	ipcMain.handle(
		IPC.saveSettings,
		async (_event, update: SettingsUpdate): Promise<Settings> => visible(await settings.save(update)),
	);

	ipcMain.handle(IPC.checkVault, async (): Promise<VaultCheck> => {
		try {
			const reader = await connectToVault(await settings.read());
			return { kind: "reachable", articles: (await reader.listArticles()).length };
		} catch (cause) {
			return { kind: "failed", reason: reason(cause) };
		}
	});

	ipcMain.handle(IPC.listArticles, async (): Promise<readonly ArticleSummary[]> => {
		const reader = await connectToVault(await settings.read());
		const slugs = await reader.listArticles();
		return Promise.all(
			slugs.map(async (slug): Promise<ArticleSummary> => {
				const [present, ready] = await Promise.all([
					reader.availableLanguages(slug),
					reader.splitLanguages(slug),
				]);
				return {
					slug,
					ready,
					unsplit: present.filter((language) => !ready.includes(language)),
					targets: targetsFor(ready),
				};
			}),
		);
	});

	ipcMain.handle(IPC.readArticle, async (_event, slug: string): Promise<ArticleResult> => {
		try {
			const reader = await connectToVault(await settings.read());
			const article = await reader.readArticle(slug);
			const documents: AssembledDocument[] = article.documents.map((document) => {
				const assembled = assembleMarkdown(document);
				return {
					language: document.language,
					title: assembled.title,
					sections: document.sections.length,
					body: assembled.body,
				};
			});
			return { kind: "ready", slug, title: article.title, documents };
		} catch (cause) {
			if (cause instanceof UnsupportedArticleLayout) {
				return { kind: "unsupported", slug, reason: cause.message };
			}
			return { kind: "failed", slug, reason: reason(cause) };
		}
	});
}

function reason(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}
