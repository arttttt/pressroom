import { contextBridge, ipcRenderer } from "electron";
import type { PageState } from "../shared/browser.js";
import { IPC, type PressroomApi } from "../shared/ipc.js";

/**
 * The bridge. It forwards and does nothing else.
 *
 * Nothing may be decided here: this code runs alongside the page, so anything
 * it enforced could be worked around from the page. Checks belong on the other
 * side of `invoke`, in the main process.
 */
const api: PressroomApi = {
	readSettings: () => ipcRenderer.invoke(IPC.readSettings),
	saveSettings: (update) => ipcRenderer.invoke(IPC.saveSettings, update),
	checkVault: () => ipcRenderer.invoke(IPC.checkVault),
	listArticles: () => ipcRenderer.invoke(IPC.listArticles),
	readArticle: (slug) => ipcRenderer.invoke(IPC.readArticle, slug),
	renderArticle: (slug, platform) => ipcRenderer.invoke(IPC.renderArticle, slug, platform),
	listPublications: (slug) => ipcRenderer.invoke(IPC.listPublications, slug),
	recordPublication: (slug, publication) => ipcRenderer.invoke(IPC.recordPublication, slug, publication),
	forgetPublication: (slug, platform, language) =>
		ipcRenderer.invoke(IPC.forgetPublication, slug, platform, language),
	openPlatform: (platform, bounds) => ipcRenderer.invoke(IPC.openPlatform, platform, bounds),
	movePlatform: (bounds) => ipcRenderer.invoke(IPC.movePlatform, bounds),
	closePlatform: () => ipcRenderer.invoke(IPC.closePlatform),
	navigatePlatform: (where) => ipcRenderer.invoke(IPC.navigatePlatform, where),
	signInTo: (platform) => ipcRenderer.invoke(IPC.signInTo, platform),
	onPlatformState: (listener) => {
		// The listener is wrapped, so what is handed to `off` is the same
		// function that was registered — otherwise the interface can subscribe
		// but never stop, and a screen it has left goes on being told about a
		// page it no longer shows.
		const forward = (_event: unknown, state: PageState) => listener(state);
		ipcRenderer.on(IPC.platformState, forward);
		return () => ipcRenderer.off(IPC.platformState, forward);
	},
};

contextBridge.exposeInMainWorld("pressroom", api);
