import { join } from "node:path";
import { app, BrowserWindow } from "electron";
import { registerVaultHandlers } from "./ipc/vault.js";
import { keychainCipher } from "./settings/cipher.js";
import { SettingsStore } from "./settings/store.js";
import { createMainWindow } from "./window/main-window.js";

/**
 * Wiring, and nothing else: what gets registered, and when a window opens.
 * Every decision this file looks like it makes belongs to the module it calls.
 */
void app.whenReady().then(() => {
	// The keychain is only there once the application is ready, and the settings
	// path is Electron's to decide — which is why both are built here and handed
	// down rather than reached for from inside the store.
	const settings = new SettingsStore(join(app.getPath("userData"), "settings.json"), keychainCipher());
	registerVaultHandlers(settings);
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
