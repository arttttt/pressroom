import { BrowserWindow, shell } from "electron";
import { join } from "node:path";

/**
 * Set by electron-vite while developing, absent in a built application. Its
 * presence is what decides where the interface is loaded from.
 */
const RENDERER_DEV_URL = process.env["ELECTRON_RENDERER_URL"];

/**
 * The application's own window — the interface, not a platform's page.
 *
 * Platform editors get windows of their own later, each on its own persistent
 * session. This one only ever shows Pressroom, so any address that is not ours
 * leaves for the real browser rather than navigating the shell away.
 */
export function createMainWindow(): BrowserWindow {
	const window = new BrowserWindow({
		width: 1100,
		height: 760,
		// Shown on `ready-to-show` instead, so it never appears blank first.
		show: false,
		titleBarStyle: "hiddenInset",
		webPreferences: {
			preload: join(import.meta.dirname, "../preload/index.mjs"),
			contextIsolation: true,
			nodeIntegration: false,
			// An ES-module preload cannot be sandboxed: Electron loads sandboxed
			// preloads as CommonJS only. Context isolation — the barrier that
			// actually separates the page from Node — stays on.
			sandbox: false,
		},
	});

	window.on("ready-to-show", () => window.show());

	window.webContents.setWindowOpenHandler(({ url }) => {
		void shell.openExternal(url);
		return { action: "deny" };
	});

	// A link in an article's preview must not carry the window off to the page
	// it cites: there is no way back from there, the interface is simply gone.
	// It opens in the real browser instead, as the same link would in Obsidian.
	window.webContents.on("will-navigate", (event, url) => {
		if (url === window.webContents.getURL()) return;
		event.preventDefault();
		void shell.openExternal(url);
	});

	if (RENDERER_DEV_URL === undefined) {
		void window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
	} else {
		void window.loadURL(RENDERER_DEV_URL);
	}

	return window;
}
