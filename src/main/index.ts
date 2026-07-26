import { app, BrowserWindow } from "electron";
import { registerPlatformHandlers } from "./ipc/platforms.js";
import { createMainWindow } from "./window/main-window.js";

/**
 * Wiring, and nothing else: what gets registered, and when a window opens.
 * Every decision this file looks like it makes belongs to the module it calls.
 */
void app.whenReady().then(() => {
	registerPlatformHandlers();
	createMainWindow();

	app.on("activate", () => {
		// The dock icon reopens the interface after its last window was closed.
		if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
	});
});

app.on("window-all-closed", () => {
	// macOS keeps an application alive without windows, and `activate` above
	// brings it back. Pressroom is macOS-only, so the other branch is a
	// formality kept for the day someone runs it elsewhere by accident.
	if (process.platform !== "darwin") app.quit();
});
