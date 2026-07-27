import { ipcMain } from "electron";
import { targetsFor } from "../../domain/platforms/targets.js";
import { assembleMarkdown } from "../../domain/render/markdown.js";
import { renderFor } from "../../domain/render/renderers.js";
import { UnsupportedArticleLayout } from "../../domain/vault/reader.js";
import type { ArticleResult, AssembledDocument } from "../../shared/article-result.js";
import type { ArticleSummary } from "../../shared/article-summary.js";
import type { Language } from "../../shared/article.js";
import type { PlatformId } from "../../shared/platform.js";
import type { Publication } from "../../shared/publication.js";
import type { RenderResult } from "../../shared/rendered.js";
import { IPC } from "../../shared/ipc.js";
import type { Settings, SettingsUpdate, VaultCheck } from "../../shared/settings.js";
import { type SettingsStore, visible } from "../settings/store.js";
import { connectToVault, forgetVaultConnection } from "../vault/connect.js";

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
	registerRender(settings);
	registerPublications(settings);

	ipcMain.handle(IPC.readSettings, async (): Promise<Settings> => visible(await settings.read()));

	ipcMain.handle(
		IPC.saveSettings,
		async (_event, update: SettingsUpdate): Promise<Settings> => visible(await settings.save(update)),
	);

	ipcMain.handle(IPC.checkVault, async (): Promise<VaultCheck> => {
		try {
			const { reader } = await connectToVault(await settings.read());
			return { kind: "reachable", articles: (await reader.listArticles()).length };
		} catch (cause) {
			forgetVaultConnection();
			return { kind: "failed", reason: reason(cause) };
		}
	});

	ipcMain.handle(IPC.listArticles, async (): Promise<readonly ArticleSummary[]> => {
		const { reader, registry } = await connectToVault(await settings.read()).catch(startOver);
		const slugs = await reader.listArticles().catch(startOver);
		return Promise.all(
			slugs.map(async (slug): Promise<ArticleSummary> => {
				const [present, ready, published] = await Promise.all([
					reader.availableLanguages(slug),
					reader.splitLanguages(slug),
					registry.list(slug),
				]);
				return {
					slug,
					ready,
					unsplit: present.filter((language) => !ready.includes(language)),
					targets: targetsFor(ready, published),
				};
			}),
		);
	});

	ipcMain.handle(IPC.readArticle, async (_event, slug: string): Promise<ArticleResult> => {
		try {
			const { reader } = await connectToVault(await settings.read());
			const article = await reader.readArticle(slug);
			const documents: AssembledDocument[] = article.documents.map((document) => {
				const assembled = assembleMarkdown(document);
				return {
					language: document.language,
					title: assembled.title,
					outline: document.sections.map((section) => ({
						heading: section.heading,
						characters: section.body.length,
					})),
					body: assembled.body,
				};
			});
			return { kind: "ready", slug, title: article.title, documents };
		} catch (cause) {
			// An article in the older layout is not a broken connection, so the
			// connection is left alone; anything else may well be one.
			if (cause instanceof UnsupportedArticleLayout) {
				return { kind: "unsupported", slug, reason: cause.message };
			}
			forgetVaultConnection();
			return { kind: "failed", slug, reason: reason(cause) };
		}
	});
}

/**
 * Where an article has already gone.
 *
 * The record lives in the vault beside the article, so recording is a write
 * through the plugin like every read — and the answer is the record as it now
 * stands, which the interface needs anyway.
 */
function registerPublications(settings: SettingsStore): void {
	ipcMain.handle(IPC.listPublications, async (_event, slug: string): Promise<readonly Publication[]> => {
		const { registry } = await connectToVault(await settings.read()).catch(startOver);
		return registry.list(slug).catch(startOver);
	});

	ipcMain.handle(
		IPC.recordPublication,
		async (_event, slug: string, publication: Publication): Promise<readonly Publication[]> => {
			const { registry } = await connectToVault(await settings.read()).catch(startOver);
			return registry.record(slug, publication).catch(startOver);
		},
	);

	ipcMain.handle(
		IPC.forgetPublication,
		async (_event, slug: string, platform: PlatformId, language: Language): Promise<readonly Publication[]> => {
			const { registry } = await connectToVault(await settings.read()).catch(startOver);
			return registry.forget(slug, platform, language).catch(startOver);
		},
	);
}

/** The same article, as one platform will be handed it. */
function registerRender(settings: SettingsStore): void {
	ipcMain.handle(
		IPC.renderArticle,
		async (_event, slug: string, platform: PlatformId): Promise<RenderResult> => {
			try {
				const { reader, registry } = await connectToVault(await settings.read());
				const [article, published] = await Promise.all([reader.readArticle(slug), registry.list(slug)]);
				return renderFor(article, platform, published);
			} catch (cause) {
				if (cause instanceof UnsupportedArticleLayout) {
					return { kind: "unsupported", platform, reason: cause.message };
				}
				forgetVaultConnection();
				return { kind: "failed", reason: reason(cause) };
			}
		},
	);
}

function reason(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Forgets the connection and lets the failure through.
 *
 * Whatever the interface does next — and what it offers is to try again — will
 * then start from a fresh conversation with the plugin rather than from what
 * was cached before Obsidian went away.
 */
function startOver(cause: unknown): never {
	forgetVaultConnection();
	throw cause;
}
