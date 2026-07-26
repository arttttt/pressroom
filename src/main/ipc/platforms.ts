import { ipcMain } from "electron";
import { PLATFORMS } from "../../domain/platforms/registry.js";
import { IPC } from "../../shared/ipc.js";

/**
 * Answers "which platforms are there".
 *
 * The renderer never reads the domain itself — it asks across the bridge and
 * the main process answers. This is the smallest instance of that rule, and for
 * now the only one; it exists so the seam is real rather than planned.
 */
export function registerPlatformHandlers(): void {
	ipcMain.handle(IPC.listPlatforms, () => PLATFORMS);
}
