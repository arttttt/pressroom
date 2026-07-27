import { BrowserWindow, type IpcMainInvokeEvent, ipcMain } from "electron";
import { pilotFor } from "../../domain/browser/pilots.js";
import { editorUrlFor } from "../../domain/platforms/registry.js";
import type { Navigation, PageState, ViewBounds } from "../../shared/browser.js";
import { IPC } from "../../shared/ipc.js";
import type { PlatformId } from "../../shared/platform.js";
import { viewsFor } from "../browser/platform-view.js";

/**
 * The platform's page, as the interface can act on it.
 *
 * Deliberately narrow. The interface says which platform and where on the
 * screen; every address comes from the platform table or from that platform's
 * pilot here in the main process. A logged-in session that can be sent to any
 * address the page asks for is the one thing worth being careful about, and
 * `navigatePlatform` takes four named moves rather than a URL for that reason.
 */
export function registerBrowserHandlers(): void {
	ipcMain.handle(
		IPC.openPlatform,
		(event, platform: PlatformId, bounds: ViewBounds): PageState =>
			views(event).show(platform, bounds, editorUrlFor(platform)),
	);

	ipcMain.handle(IPC.movePlatform, (event, bounds: ViewBounds): void => views(event).move(bounds));

	ipcMain.handle(IPC.closePlatform, (event): void => views(event).hide());

	ipcMain.handle(IPC.navigatePlatform, (event, where: Navigation): void => {
		const open = views(event);
		const showing = open.current();
		if (showing === null) return;
		switch (where) {
			case "editor":
				open.go(editorUrlFor(showing.platform));
				return;
			case "sign-in": {
				const pilot = pilotFor(showing.platform);
				// A platform nobody has read yet has no sign-in page on record.
				// Its own site will offer one; this simply does not know where.
				if (pilot !== null) open.go(pilot.signInUrl);
				return;
			}
			case "back":
				open.back();
				return;
			case "reload":
				open.reload();
				return;
		}
	});
}

/** The pages belonging to the window the request came from. */
function views(event: IpcMainInvokeEvent) {
	const host = BrowserWindow.fromWebContents(event.sender);
	if (host === null) throw new Error("This request came from no window.");
	return viewsFor(host);
}
