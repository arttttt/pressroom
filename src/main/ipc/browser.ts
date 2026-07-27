import { ipcMain, shell } from "electron";
import { editorUrlFor } from "../../domain/platforms/registry.js";
import { IPC } from "../../shared/ipc.js";
import type { PlatformId } from "../../shared/platform.js";

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
export function registerBrowserHandlers(): void {
	ipcMain.handle(IPC.openEditor, async (_event, platform: PlatformId): Promise<void> => {
		await shell.openExternal(editorUrlFor(platform));
	});
}
