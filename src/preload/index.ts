import { contextBridge, ipcRenderer } from "electron";
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
	openEditor: (slug, platform) => ipcRenderer.invoke(IPC.openEditor, slug, platform),
	listPlatforms: () => ipcRenderer.invoke(IPC.listPlatforms),
};

contextBridge.exposeInMainWorld("pressroom", api);
