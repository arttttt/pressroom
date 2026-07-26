import type { Platform } from "./platform.js";

/**
 * The channel names, in one place so neither side of the bridge can invent a
 * call the other does not answer.
 */
export const IPC = {
	listPlatforms: "platforms:list",
} as const;

/**
 * Everything the renderer can reach — and the whole of it.
 *
 * The renderer has no Node, no `electron`, and no access to the domain. It asks
 * the main process, which owns every implementation. Widening this interface is
 * the only way to widen what the interface can do, which is the point of having
 * it: the surface is visible in one file rather than spread across call sites.
 */
export interface PressroomApi {
	listPlatforms(): Promise<readonly Platform[]>;
}
