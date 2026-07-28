import { ipcMain } from "electron";
import { targetsFor } from "../../domain/platforms/targets.js";
import { localDate, recordable } from "../../shared/recording.js";
import type { PublicationRegistry } from "../../domain/registry/registry.js";
import { assembleMarkdown } from "../../domain/render/markdown.js";
import { UnsupportedArticleLayout, type VaultReader } from "../../domain/vault/reader.js";
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
import { VaultUnreachable } from "../vault/rest-client.js";
import { prepareFor } from "../vault/prepare.js";

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
			if (cause instanceof VaultUnreachable) forgetVaultConnection();
			return { kind: "failed", reason: reason(cause) };
		}
	});

	ipcMain.handle(IPC.listArticles, async (): Promise<readonly ArticleSummary[]> => {
		const { reader, registry } = await connectToVault(await settings.read()).catch(startOver);
		const slugs = await reader.listArticles().catch(startOver);
		return Promise.all(slugs.map((slug) => summarise(reader, registry, slug)));
	});

	/**
	 * The same thing for one article.
	 *
	 * An article's own page needs it while it is open: a language folder
	 * appearing in Obsidian adds a destination, and asking for the whole desk
	 * to find that out is a request per article for an answer about one.
	 */
	ipcMain.handle(IPC.readSummary, async (_event, slug: string): Promise<ArticleSummary> => {
		const { reader, registry } = await connectToVault(await settings.read()).catch(startOver);
		return summarise(reader, registry, slug).catch(startOver);
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
			if (cause instanceof VaultUnreachable) forgetVaultConnection();
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

	// Both answer with the article as the desk knows it afterwards, rather than
	// with the publications alone. Where a destination stands is decided in one
	// place — `targetsFor`, which knows what is written as well as what is
	// published — instead of being recomposed by the screen from half of that.
	ipcMain.handle(
		IPC.recordPublication,
		async (_event, slug: string, publication: Publication): Promise<ArticleSummary> => {
			const { reader, registry } = await connectToVault(await settings.read()).catch(startOver);
			if (!recordable(publication, localDate(new Date()))) {
				throw new Error("A publication needs an address and the day it went out.");
			}
			await registry.record(slug, publication).catch(startOver);
			return summarise(reader, registry, slug).catch(startOver);
		},
	);

	ipcMain.handle(
		IPC.forgetPublication,
		async (_event, slug: string, platform: PlatformId, language: Language): Promise<ArticleSummary> => {
			const { reader, registry } = await connectToVault(await settings.read()).catch(startOver);
			await registry.forget(slug, platform, language).catch(startOver);
			return summarise(reader, registry, slug).catch(startOver);
		},
	);
}

/** The same article, as one platform will be handed it. */
function registerRender(settings: SettingsStore): void {
	ipcMain.handle(
		IPC.renderArticle,
		(_event, slug: string, platform: PlatformId): Promise<RenderResult> =>
			prepareFor(settings, slug, platform),
	);
}

/**
 * One article as the desk knows it: which languages are ready, which are
 * written but not split, and where it can still go.
 *
 * Costs folder listings rather than reading the article, which is what lets a
 * screen ask again every few seconds without reading twenty thousand
 * characters to learn that nothing has changed.
 */
async function summarise(
	reader: VaultReader,
	registry: PublicationRegistry,
	slug: string,
): Promise<ArticleSummary> {
	const [present, published] = await Promise.all([
		reader.availableLanguages(slug),
		registry.list(slug),
	]);
	const ready = await reader.splitLanguages(slug, present);
	return {
		slug,
		ready,
		unsplit: present.filter((language) => !ready.includes(language)),
		targets: targetsFor(ready, published),
	};
}

function reason(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Lets the failure through, forgetting the connection first if the connection
 * is what failed.
 *
 * Only then. It was called for every failure, and a missing folder is a
 * failure — so an article renamed in Obsidian dropped the pinned certificate,
 * and the next poll fetched it again without verifying it. Twice every ten
 * seconds, for as long as the article stayed on screen, rather than the once
 * per run the pinning was written for.
 */
function startOver(cause: unknown): never {
	if (cause instanceof VaultUnreachable) forgetVaultConnection();
	throw cause;
}
