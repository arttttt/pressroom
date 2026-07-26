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
	listPlatforms: () => ipcRenderer.invoke(IPC.listPlatforms),
};

contextBridge.exposeInMainWorld("pressroom", api);
