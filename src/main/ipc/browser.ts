import { ipcMain, shell } from "electron";
import { editorUrlFor, PLATFORMS } from "../../domain/platforms/registry.js";
import { submissionUrlFor } from "../../domain/platforms/submission.js";
import { IPC } from "../../shared/ipc.js";
import type { PlatformId, PlatformSummary } from "../../shared/platform.js";
import type { SettingsStore } from "../settings/store.js";
import { prepareFor } from "../vault/prepare.js";

/**
 * Opening a platform's editor — in the browser the person already uses.
 *
 * Not a browser of our own. Pressroom tried carrying one: a Chromium view per
 * platform with its own logged-in session. Everything about it fought back —
 * sign-in providers refuse an embedded browser, a password manager cannot
 * reach into one, and each editor's markup rots on its own schedule. Meanwhile
 * the person's real browser is already signed in to all five, with their own
 * password manager working in it.
 *
 * So Pressroom does the part nobody else can: it assembles the article,
 * renders it in the platform's dialect, and says where it has already gone.
 * The address goes out to the real browser, the text goes out on the
 * clipboard, and the last two inches are the person's.
 *
 * The renderer names a platform, never an address: the addresses live in the
 * platform table, and nothing in the interface can send the browser somewhere
 * it was not built to go.
 */
export function registerBrowserHandlers(settings: SettingsStore): void {
	ipcMain.handle(
		IPC.openEditor,
		async (_event, slug: string, platform: PlatformId): Promise<void> => {
			// The same rendering the panel is showing, from the same function, so
			// what opens can never be a different article from what was read.
			const prepared = await prepareFor(settings, slug, platform);
			// Nothing prepared still has an editor worth opening; the panel has
			// already said why it is empty.
			await shell.openExternal(
				prepared.kind === "rendered" ? submissionUrlFor(prepared.rendered) : editorUrlFor(platform),
			);
		},
	);

	ipcMain.handle(
		IPC.listPlatforms,
		(): readonly PlatformSummary[] =>
			// Names and languages only. How each is reached stays here.
			PLATFORMS.map((platform) => ({
				id: platform.id,
				displayName: platform.displayName,
				language: platform.languages[0] ?? "en",
			})),
	);
}
