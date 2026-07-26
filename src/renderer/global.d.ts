import type { PressroomApi } from "../shared/ipc.js";

declare global {
	interface Window {
		/** Installed by the preload bridge. The renderer's only way out. */
		readonly pressroom: PressroomApi;
	}
}
