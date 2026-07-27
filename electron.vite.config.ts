import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

/**
 * The three builds this application is made of.
 *
 * Entry points are electron-vite's defaults — `src/main/index.ts`,
 * `src/preload/index.ts` and `src/renderer` — so the layout is the convention
 * rather than something to look up here.
 *
 * The preload is built as CommonJS rather than an ES module, which is what
 * lets the window run sandboxed: Electron loads a sandboxed preload as
 * CommonJS only, and the bridge needs nothing from Node beyond `contextBridge`
 * and `ipcRenderer`, both of which a sandboxed preload has.
 *
 * `externalizeDepsPlugin` keeps `electron` and anything else installed out of
 * the main and preload bundles: those resolve their imports at runtime. The
 * renderer is the opposite — bundled whole, which is why React sits in
 * devDependencies and never ships as a runtime dependency.
 */
export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()],
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
		build: {
			rollupOptions: { output: { format: "cjs", entryFileNames: "index.js" } },
		},
	},
	renderer: {
		plugins: [react()],
	},
});
