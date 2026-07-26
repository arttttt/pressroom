import react from "@vitejs/plugin-react";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

/**
 * The three builds this application is made of.
 *
 * Entry points are left at electron-vite's defaults — `src/main/index.ts`,
 * `src/preload/index.ts` and `src/renderer` — so the layout is the convention
 * rather than something to look up here.
 *
 * `externalizeDepsPlugin` keeps `electron` and anything else installed out of
 * the main and preload bundles: those run in Node and resolve their imports at
 * runtime. The renderer is the opposite — it is bundled whole, which is why
 * React sits in devDependencies and never ships as a runtime dependency.
 */
export default defineConfig({
	main: {
		plugins: [externalizeDepsPlugin()],
	},
	preload: {
		plugins: [externalizeDepsPlugin()],
	},
	renderer: {
		plugins: [react()],
	},
});
